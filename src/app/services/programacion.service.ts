import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { SqliteManagerService } from './sqlite-manager.service';
import { forkJoin, from, lastValueFrom, map, Observable } from 'rxjs';
import { Programacion } from '../models/programacion';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class ProgramacionService {

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient, private sqlService: SqliteManagerService) { }

  obternerVps(endPoint: string): Observable<Programacion[]> {
    const token = localStorage.getItem('token')
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    })
    return this.http.get<Programacion[]>(`${this.apiUrl}${endPoint}`, { headers })
  }

  async obtenerLocal(tabla: string): Promise<Programacion[]> {
    const db = await this.sqlService.getDbName()
    const sql = `SELECT * FROM ${tabla}`

    try {
      const result = await CapacitorSQLite.query({
        database: db,
        statement: sql,
        values: []
      });
      if (result.values) {
        const datos = await result.values.map(row => ({
          id: row.id,
          fecha: row.fecha,
          lote: row.lote,
          jornal: row.jornal,
          cantidad: row.cantidad,
          habilitado: row.habilitado,
          sincronizado: row.sincronizacion,
          fecSincronizacion: row.fecSincronizacion,
          observacion: row.observacion,
          signo: row.signo,
          maquina: row.maquina,
          usuario: row.usuario,
          usuarioMod: row.usuarioMod,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          sucursalId: row.sucursalId,
          fincaId: row.fincaId,
          actividadId: row.actividadId,
          estadoId: row.estadoId,
          prioridadId: row.prioridadId
        }))
        return datos;
      } else {
        throw new Error('No se encontraron datos de la programacion en la base de datos')
      }
    } catch (error) {
      console.error('Error al consultar a la base de datos', error)
      throw error
    }
  }

  comparacion(endPoint: string, tabla: string): Observable<{ update: Programacion[], create: Programacion[] }> {
    return forkJoin({
      vpsDatos: this.obternerVps(endPoint),
      localDatos: from(this.obtenerLocal(tabla))
    }).pipe(
      map(result => {
        const { vpsDatos, localDatos } = result;
  
        console.log('Datos del VPS:', vpsDatos);
        console.log('Datos locales:', localDatos);
  
        if (localDatos.length === 0) {
          console.log('No hay datos locales, todos los datos del VPS serán creados.');
          return { update: [], create: vpsDatos };
        }
  
        const update = vpsDatos.filter(vpsDato => {
          const localDato = localDatos.find(localDato => localDato.id === vpsDato.id);
          if (!localDato) return false;
  
          return Object.keys(vpsDato).some(key => vpsDato[key] !== localDato[key]);
        });
  
        const create = vpsDatos.filter(
          vpsDato => !localDatos.find(localDato => localDato.id === vpsDato.id)
        );
  
        console.log('Datos para actualizar:', update);
        console.log('Datos para crear:', create);
  
        return { update, create };
      })
    );
  }  

  async update(datosDiferentes: Programacion[], tabla: string) {
    console.log(`Datos diferentes recibidos para actualizar: ${datosDiferentes}`)
    if (datosDiferentes.length === 0) {
      console.log(`No hay datos diferente para actualizar`)
      return
    }
    const db = await this.sqlService.getDbName()

    const sql = `UPDATE ${tabla} SET fecha=?, lote=?, jornal=?, cantidad=?, habilitado=?, sincronizado=?, fecSincronizacion=?, observacion=?, signo=?, maquina=?, usuario=?, usuarioMod=?, createdAt=?, updatedAt=?, sucursalId=?, fincaId=?, actividadId=?, estadoId=?, prioridadId=? WHERE id = ?`

    try {
      for (const datos of datosDiferentes) {
        let cambios = []

        if (datos.fecha !== undefined) cambios.push('fecha');
        if (datos.lote !== undefined) cambios.push('lote');
        if (datos.jornal !== undefined) cambios.push('jornal');
        if (datos.cantidad !== undefined) cambios.push('cantidad');
        if (datos.habilitado !== undefined) cambios.push('habilitado');
        if (datos.sincronizado !== undefined) cambios.push('sincronizado');
        if (datos.fecSincronizacion !== undefined) cambios.push('fecSincronizacion');
        if (datos.observacion !== undefined) cambios.push('observacion');
        if (datos.signo !== undefined) cambios.push('signo');
        if (datos.maquina !== undefined) cambios.push('maquina');
        if (datos.usuario !== undefined) cambios.push('usuario');
        if (datos.usuarioMod !== undefined) cambios.push('usuarioMod');
        if (datos.createdAt !== undefined) cambios.push('createdAt');
        if (datos.updatedAt !== undefined) cambios.push('updatedAt');
        if (datos.sucursalId !== undefined) cambios.push('sucursalId')
        if (datos.fincaId !== undefined) cambios.push('fincaId');
        if (datos.actividadId !== undefined) cambios.push('actividadId');
        if (datos.estadoId !== undefined) cambios.push('estadoId');
        if (datos.prioridadId !== undefined) cambios.push('prioridadId');

        await CapacitorSQLite.executeSet({
          database: db,
          set: [
            {
              statement: sql,
              values: [
                datos.fecha || null,
                datos.lote || null,
                datos.jornal || null,
                datos.cantidad || null,
                datos.habilitado || null,
                datos.sincronizado || null,
                datos.fecSincronizacion || null,
                datos.observacion || null,
                datos.signo || null,
                datos.maquina || null,
                datos.usuario || null,
                datos.usuarioMod || null,
                datos.createdAt || null,
                datos.updatedAt || null,
                datos.sucursalId || null,
                datos.fincaId || null,
                datos.actividadId || null,
                datos.estadoId || null,
                datos.prioridadId || null
              ]
            }
          ]
        })
        if (cambios.length > 0) {
          console.log(`Programacion con id ${datos.id} actualizada con exito, ${cambios.join(', ')}`)
        } else {
          console.log(`Programacion con id ${datos.id} no requiere de actualizacion`)
        }
      }
    } catch (error) {
      console.error('Error al actualizar las categorias')
    }
  }

  async create(datosParaCrear: Programacion[], tabla: string) {
    const db = await this.sqlService.getDbName();
    const sql = `INSERT INTO ${tabla} 
      (id, fecha, lote, jornal, cantidad, habilitado, sincronizado, fecSincronizacion, observacion, signo, maquina, usuario, usuarioMod, createdAt, updatedAt, sucursalId, fincaId, actividadId, estadoId, prioridadId) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
    try {
      for (const datos of datosParaCrear) {
        const exsDatos = await CapacitorSQLite.query({
          database: db,
          statement: `SELECT id FROM ${tabla} WHERE id = ?`,
          values: [datos.id]
        });
  
        if (exsDatos.values.length === 0) {
          await CapacitorSQLite.executeSet({
            database: db,
            set: [{
              statement: sql,
              values: [
                datos.id,
                datos.fecha,
                datos.lote,
                datos.jornal,
                datos.cantidad,
                datos.habilitado,
                datos.sincronizado,
                datos.fecSincronizacion,
                datos.observacion,
                datos.signo,
                datos.maquina,
                datos.usuario,
                datos.usuarioMod,
                datos.createdAt,
                datos.updatedAt,
                datos.sucursalId,
                datos.fincaId,
                datos.actividadId,
                datos.estadoId,
                datos.prioridadId
              ]
            }]
          });
          console.log(`Programacion con id ${datos.id} creada con exito: ${JSON.stringify(datos)}`);
        } else {
          console.log(`Programacion con id ${datos.id} ya existe, omitiendo la insercion`);
        }
      }
    } catch (error) {
      console.error('Error al crear nuevos datos: ', error);
    }
  } 

  async sincronizar(endPoint: string, tabla: string) {
    try {
      const { update, create } = await lastValueFrom(this.comparacion(endPoint, tabla))

      if (update.length > 0) {
        await this.update(update, tabla)
        console.log(`Programacion actualizada con exito`)
      } else {
        console.log(`No hay datos que actualizar`)
      }

      if (create.length > 0) {
        await this.create(create, tabla)
        console.log('Datos de la programacion insertados correctamente')
      }

      if (update.length === 0 && create.length === 0) {
        console.log('No hay cambios para aplicar')
      }
    } catch (error) {
      console.error(`Error en la sincronizacion: ${error}`)
    }
  }

}
