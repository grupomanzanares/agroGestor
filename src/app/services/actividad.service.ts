import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { SqliteManagerService } from './sqlite-manager.service';
import { forkJoin, from, map, Observable } from 'rxjs';
import { Actividad } from '../models/actividad';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class ActividadService {

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient, private sqlManagerService: SqliteManagerService) { }

  obtenerVps(endPoint: string): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(`${this.apiUrl}${endPoint}`)
  }

  async obtenerLocal(tabla: string): Promise<Actividad[]> {
    const db = await this.sqlManagerService.getDbName()
    const sql = `SELECT * FROM ${tabla}`

    try {
      const result = await CapacitorSQLite.query({
        database: db,
        statement: sql,
        values: []
      })
      if (result.values) {
        const datos = await result.values.map(row => ({
          id: row.id,
          nombre: row.nombre,
          descripcion: row.descripcion,
          controlPorLote: row.controlPorLote,
          habilitado: row.habilitado,
          usuario: row.usuario,
          usuarioMod: row.usuarioMod,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          unidadId: row.unidadId,
          subCategoriaId: row.subCategoriaId
        }))
        return datos;
      } else {
        throw new Error("No se encontraron datos de las actividades en la base de datos")
      }
    } catch (error) {
      console.error('Error al consultar los datos locales', error)
      throw error
    }
  }

  comparacion(endPoint: string, tabla: string): Observable<{ update: Actividad[], create: Actividad[] }> {
    return forkJoin({
      vpsDatos: this.obtenerLocal(endPoint),
      localDatos: from(this.obtenerLocal(tabla))
    }).pipe(
      map(result => {
        const { vpsDatos, localDatos } = result

        if (localDatos.length === 0) {
          console.log('No hay datos locales, todos los datos del VPS seran creados')
          return { update: [], create: vpsDatos }
        }

        const update = vpsDatos.filter(vpsDato => {
          const localDato = localDatos.find(localDato => localDato.id === vpsDato.id)
          if (!localDato) return false

          return (
            vpsDato.nombre !== localDato.nombre ||
            vpsDato.descripcion !== localDato.descripcion ||
            vpsDato.controlPorLote !== localDato.controlPorLote ||
            vpsDato.habilitado !== localDato.habilitado ||
            vpsDato.usuario !== localDato.usuario ||
            vpsDato.usuarioMod !== localDato.usuarioMod ||
            vpsDato.createdAt !== localDato.createdAt ||
            vpsDato.updatedAt !== localDato.updatedAt ||
            vpsDato.unidadId !== localDato.unidadId ||
            vpsDato.subCategoriaId !== localDato.subCategoriaId
          )
        });
        const create = vpsDatos.filter(vpsDatos => !localDatos.find(localDato => localDato.id === vpsDatos.id))
        return { update, create }
      })
    )
  }

  async update(datosDiferentes: Actividad[], tabla: string) {
    console.log(`Datos diferentes recibidos para actualizar: ${datosDiferentes}`)
    if (datosDiferentes.length === 0) {
      console.log(`No hay datos diferentes para actualizar`)
      return
    }
    const db = await this.sqlManagerService.getDbName()
    const sql = `UPDATE ${tabla} SET nombre=?, descripcion=?, controlPorLote?, habilitado=?, usuario=?, usuarioMod=?, createdAt=?, updatedAt=?, unidadId=?, subCategoriaId=? WHERE id = ?`

    try {
      for (const datos of datosDiferentes) {
        let cambios = []

        if (datos.nombre !== undefined) cambios.push('nombre');
        if (datos.descripcion !== undefined) cambios.push('descripcion');
        if (datos.controlPorLote !== undefined) cambios.push('controlPorLote')
        if (datos.habilitado !== undefined) cambios.push('habilitado');
        if (datos.usuario !== undefined) cambios.push('usuario');
        if (datos.usuarioMod !== undefined) cambios.push('usuarioMod');
        if (datos.createdAt !== undefined) cambios.push('createdAt');
        if (datos.updatedAt !== undefined) cambios.push('updatedAt');
        if (datos.unidadId !== undefined) cambios.push('unidadId');
        if (datos.subCategoriaId !== undefined) cambios.push('subCategoriaId');

        await CapacitorSQLite.executeSet({
          database: db,
          set: [
            {
              statement: sql,
              values: [
                datos.nombre || null,
                datos.descripcion || null,
                datos.controlPorLote || null,
                datos.habilitado || null,
                datos.usuario || null,
                datos.usuarioMod || null,
                datos.createdAt || null,
                datos.updatedAt || null,
                datos.unidadId || null,
                datos.subCategoriaId || null
              ]
            }
          ]
        })
        if(cambios.length > 0){
          console.log(`Actividad con id ${datos.id} actializada correctaente`)
        }else{
          console.log(`Actividad con id ${datos.id} no requiere de actualizacion`)
        }
      }
    } catch (error) {
      console.error('Error al actualizar las actividades: ', error)
    }
  }

}
