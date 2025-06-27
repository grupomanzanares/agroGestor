import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { SqliteManagerService } from './sqlite-manager.service';
import { forkJoin, from, lastValueFrom, map, Observable } from 'rxjs';
import { Trabajador } from '../models/trabajadores';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class TrabajadorService {

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient, private sqlManajer: SqliteManagerService) { }

  obtenerVps(endPoint: string): Observable<Trabajador[]>{
    const token = localStorage.getItem('token')
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    })
    return this.http.get<Trabajador[]>(`${this.apiUrl}${endPoint}`, { headers })
  }

  async obtenerLocal(tabla: string): Promise<Trabajador[]> {
    const db = await this.sqlManajer.getDbName()
    const sql = `SELECT * FROM ${tabla} WHERE habilitado = 1`

    try {
      const result = await CapacitorSQLite.query({
        database: db,
        statement: sql,
        values: []
      });

      if (result.values) {
        const datos = result.values.map( row => ({
          id: row.id,
          nit: row.nit,
          nombre: row.nombre,
          habilitado: row.habilitado,
          observacion: row.observacion,
          usuario: row.usuario,
          usuarioMod: row.usuarioMod,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          unidadId: row.unidadId,
          tipoIdentificacion: row.tipoIdentificacion
        }))
        return datos
      } else {
        throw new Error('No se encontraron datos en la base de datos local')
      }
    } catch (error) {
      console.error('Error al consultar los datos locales:', error);
      throw error;
    }
  }

  comparacion(endPoint: string, tabla: string): Observable<{ update: Trabajador[], create: Trabajador[] }> {
    return forkJoin({
      vpsDatos: this.obtenerVps(endPoint),
      localDatos: from(this.obtenerLocal(tabla))
    }).pipe(
      map(result => {
        const { vpsDatos, localDatos } = result

        if (localDatos.length === 0) {
          console.log('No hay datos locales, todos los datos del vps seran creados')
          return { update: [], create: vpsDatos }
        }

        const update = vpsDatos.filter(vpsDato => {
          const localDato = localDatos.find(localDato => localDato.id === vpsDato.id)
          
          if (!localDato) return false;

          return (
            vpsDato.nit !== localDato.nit ||
            vpsDato.nombre !== localDato.nombre ||
            vpsDato.habilitado !== localDato.habilitado ||
            vpsDato.observacion !== localDato.observacion || 
            vpsDato.usuario !== localDato.usuario ||
            vpsDato.usuarioMod !== localDato.usuarioMod ||
            vpsDato.createdAt !== localDato.createdAt ||
            vpsDato.updatedAt !== localDato.updatedAt ||
            vpsDato.tipoIdentificacion !== localDato.tipoIdentificacion
          )
        })

        const create = vpsDatos.filter(vpsDato => !localDatos.some(localDato => localDato.id === vpsDato.id))

        return { update, create }
      })
    )
  }

  async update(datosDiferentes: Trabajador[], tabla: string){
    if (datosDiferentes.length === 0) {
      console.log(`No hay datos diferentes para actualizar`)
      return
    }
    const db = await this.sqlManajer.getDbName()
    const sql = `UPDATE ${tabla} SET nit=?, nombre=?, habilitado=?, observacion=?, usuario=?, usuarioMod=?, createdAt=?, updatedAt=?, tipoIdentificacion=? WHERE id = ?`
  
    try {
      for (const datos of datosDiferentes) {
        let cambios = []

        if (datos.nit !== undefined) cambios.push('nit');
        if (datos.nombre !== undefined) cambios.push('nombre');
        if (datos.habilitado !== undefined) cambios.push('habilitado');
        if (datos.observacion !== undefined) cambios.push('observacion');
        if (datos.usuario !== undefined) cambios.push('usuario');
        if (datos.usuarioMod !== undefined) cambios.push('usuarioMod');
        if (datos.createdAt !== undefined) cambios.push('createdAt');
        if (datos.updatedAt !== undefined) cambios.push('updatedAt');
        if (datos.tipoIdentificacion !== undefined) cambios.push('tipoIdentificacion');

        await CapacitorSQLite.executeSet({
          database: db,
          set: [
            {
              statement: sql,
              values: [
                datos.nit || null, 
                datos.nombre || null,
                datos.habilitado || null,
                datos.observacion || null,
                datos.usuario || null,
                datos.usuarioMod || null,
                datos.createdAt || null,
                datos.updatedAt || null,
                datos.tipoIdentificacion || null
              ]
            }
          ]
        })
        if (cambios.length > 0) {
          console.log(`Trabajador con id ${datos.id} actualizado correctamente`)
        } else {
          console.log(`Trabajador con id ${datos.id} no requiere de actualizacion`)
        }
      }
    } catch (error) {
      console.error('Error al actualizar los trabajadores: ', error)
    }
  }

  async create(datosParaCrear: Trabajador[], tabla: string) {
    const db = await this.sqlManajer.getDbName();
    const sql = `INSERT INTO ${tabla} (id, nit, nombre, habilitado, observacion, usuario, usuarioMod, createdAt, updatedAt, tipoIdentificacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

    try {
      for (const datos of datosParaCrear) {
        
        const exsDatos = await CapacitorSQLite.query({
          database: db,
          statement: `SELECT id FROM ${tabla} WHERE id = ?`,
          values: [datos.id]
        })

        if (exsDatos.values && exsDatos.values.length === 0) {
          await CapacitorSQLite.executeSet({
            database: db,
            set: [{
              statement: sql,
              values: [
                datos.id,
                datos.nit,
                datos.nombre,
                datos.habilitado,
                datos.observacion,
                datos.usuario,
                datos.usuarioMod,
                datos.createdAt,
                datos.updatedAt,
                datos.tipoIdentificacion
              ]
            }]
          })
        }
      }
    } catch (error) {
      console.error('Error al crear nuevos datos:', error);
    } 
  }

  async sincronizar(endPoint: string, tabla: string) {
    try {
      const { update, create } = await lastValueFrom(this.comparacion(endPoint, tabla))

      if (update.length > 0) {
        await this.update(update, tabla);
        console.log('Datos actualizados con éxito');
      } else {
        console.log('No hay datos que actualizar');
      }
  
      if (create.length > 0) {
        await this.create(create, tabla);
        console.log('Datos creados con éxito');
      } else {
        console.log('No hay datos que crear');
      }
  
      if (update.length === 0 && create.length === 0) { 
        console.log('No hay cambios para aplicar');
      }

    } catch (error) {
      console.error('Error en la sincronización:', error);
    }
  }
  
}
