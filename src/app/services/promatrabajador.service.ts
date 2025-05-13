import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { SqliteManagerService } from './sqlite-manager.service';
import { Programacion } from '../models/programacion';
import { forkJoin, lastValueFrom, map, Observable } from 'rxjs';
import { Proma_Trabajador } from '../models/promatrabajador';
import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class PromatrabajadorService {

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient, private sqlService: SqliteManagerService, private toast: ToastService) { }

  obternerVps(endPoint: string): Observable<Proma_Trabajador[]> {
    const token = localStorage.getItem('token')
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    })
    return this.http.get<Proma_Trabajador[]>(`${this.apiUrl}${endPoint}`, { headers })
  }

  async obtenerLocal(tabla: string): Promise<Proma_Trabajador[]> {
    const db = await this.sqlService.getDbName()
    const sql = `SELECT * FROM ${tabla} WHERE sincronizado = 0`

    try {
      const result = await CapacitorSQLite.query({
        database: db,
        statement: sql,
        values: []
      });

      if (result.values) {
        const datos = result.values
        .filter(row => row && row.programacionId !== undefined && row.trabajadorId !== undefined)
        .map(row => ({
          programacionId: row.programacionId,
          trabajadorId: row.trabajadorId,
          sincronizado: row.sincronizado ?? 0
        }));      
        console.log(datos)
        return datos
      } else {
        throw new Error('No se encontraron datos')
      }
    } catch (error) {
      console.error('Error al consultar', error)
      throw error
    }
  }

  comparacion(endPoint: string, tabla: string): Observable<{ update: Proma_Trabajador[], create: Proma_Trabajador[] }> {
    return forkJoin({
      vpsDatos: this.obternerVps(endPoint),
      localDatos: this.obtenerLocal(tabla)
    }).pipe(
      map(result => {
        const { vpsDatos, localDatos } = result

        if (localDatos.length === 0) {
          console.log('No hay datos locales, todos los datos del VPS serán creados.')
          return { update: [], create: vpsDatos }
        }

        const update = vpsDatos.filter(vpsDato => {
          const localDato = localDatos.find(localDato => localDato.programacionId === vpsDato.programacionId)
          if (!localDato) return false

          return (
            vpsDato.trabajadorId !== localDato.trabajadorId ||
            vpsDato.programacionId !== localDato.programacionId ||
            vpsDato.sincronizado !== localDato.sincronizado
          )
        })

        const create = vpsDatos.filter(vpsDato => !localDatos.some(localDato => localDato.trabajadorId === vpsDato.trabajadorId))
        return { update, create }
      })
    )
  }

  async update(datosDiferentes: Proma_Trabajador[], tabla: string) {
    if (datosDiferentes.length === 0) {
      console.log(`No hay datos diferentes para actualizar`)
      return
    }

    const db = await this.sqlService.getDbName()
    const sql = `UPDATE ${tabla} SET trabajadorId=?, sincronizado=?`

    try {
      for (const datos of datosDiferentes) {
        let cambios = []

        if (datos.trabajadorId !== undefined) cambios.push('trabajadorId');
        if (datos.sincronizado !== undefined) cambios.push('sincronizado');

        await CapacitorSQLite.executeSet({
          database: db,
          set: [
            {
              statement: sql,
              values: [
                datos.trabajadorId || null,
                datos.sincronizado || null
              ]
            }
          ]
        })
        if (cambios.length > 0) {
          console.log(`Programacion Trabajador con id ${datos.programacionId} actualizado correctamente`)
        }
        else {
          console.log(`Programacion Trabajador con id ${datos.programacionId} no requiere de actualizacio`)
        }
      }
    } catch (error) {
      console.error('Error al actualizar las Programaciones y Trabajadores: ', error)
    }
  }

  async create(datosParaCrear: Proma_Trabajador[], tabla: string) {
    const db = await this.sqlService.getDbName();
    const sql = `INSERT INTO ${tabla} (programacionId, trabajadorId, sincronizado) VALUES (?, ?, ?)`

    try {
      for (const datos of datosParaCrear) {
        const exsDatos = await CapacitorSQLite.query({
          database: db,
          statement: `SELECT programacionId FROM ${tabla} WHERE programacionId = ?`,
          values: [datos.programacionId]
        })

        if (exsDatos.values && exsDatos.values.length === 0) {
          await CapacitorSQLite.executeSet({
            database: db,
            set: [{
              statement: sql,
              values: [
                datos.programacionId,
                datos.trabajadorId,
                datos.sincronizado
              ]
            }]
          })
        }
      }
    } catch (error) {
      console.error('Error al crear nuevos datos:', error);
    }
  }

  async descargarDatosVps(tabla: string, endPoint: string) {
    try {
      const { create } = await lastValueFrom(this.comparacion(endPoint, tabla));
      if (!create || create.length === 0) {
        console.log('No hay datos nuevos del VPS para guardar localmente.');
        return;
      }
      await this.create(create, tabla);
      console.log('Datos del VPS guardados localmente.');
    } catch (error) {
      console.error('Error al descargar datos desde el VPS:', error);
    }
  }

  async sincronizar(endPoint: string, tabla: string) {
    try {
      const trabajadores = await this.obtenerLocal(tabla);
  
      if (!trabajadores || trabajadores.length === 0) {
        console.log('No hay datos locales para sincronizar.');
        return;
      }
  
      // Validar que todos los registros tienen programacionId
      const programacionValido = trabajadores.find(t => t.programacionId !== undefined);
      if (!programacionValido) {
        console.error('Ningún trabajador tiene programacionId definido.');
        return;
      }
  
      const programacionId = programacionValido.programacionId;
  
      console.log('Datos que se van a subir al VPS:', trabajadores);
  
      const payload = {
        programacionId,
        trabajadores
      };
  
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
  
      const response = await lastValueFrom(
        this.http.post(`${this.apiUrl}${endPoint}/create`, payload, { headers })
      );
  
      console.log('Respuesta del VPS:', response);
      this.toast.presentToast('Datos nuevos sincronizados correctamente', 'success', 'top');
  
      const db = await this.sqlService.getDbName();
      for (const item of trabajadores) {
        if (item.programacionId && item.trabajadorId) {
          await CapacitorSQLite.execute({
            database: db,
            statements: `UPDATE ${tabla} SET sincronizado = 1 WHERE programacionId = ${item.programacionId} AND trabajadorId = ${item.trabajadorId}`
          });
        }
      }
    } catch (error) {
      console.error('Error al sincronizar datos', error);
      throw error;
    }
  }
  

}
