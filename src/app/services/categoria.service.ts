import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { SqliteManagerService } from './sqlite-manager.service';
import { forkJoin, from, lastValueFrom, map, Observable } from 'rxjs';
import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { Categoria } from '../models/act-categoria';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient, private sqlManagerService: SqliteManagerService) { }

  obtenerVps(endPoint: string): Observable<Categoria[]> {
    const token = localStorage.getItem('token')
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    })
    return this.http.get<Categoria[]>(`${this.apiUrl}${endPoint}`, { headers })
  }

  async obtenerLocal(tabla: string): Promise<Categoria[]> {
    const db = await this.sqlManagerService.getDbName()
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
          nombre: row.nombre,
          descripcion: row.descripcion,
          habilitado: row.habilitado,
          usuario: row.usuario,
          usuarioMod: row.usuarioMod,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          sucursalId: row.sucursalId
        }))
        return datos;
      } else {
        throw new Error("No se encontraron datos de las Categoriaes en la base de datos")
      }
    } catch (error) {
      console.error('Error al consultar los datos locales', error)
      throw error
    }
  }

  comparacion(endPoint: string, tabla: string): Observable<{ update: Categoria[], create: Categoria[] }> {
    return forkJoin({
      vpsDatos: this.obtenerVps(endPoint),
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
            vpsDato.habilitado !== localDato.habilitado ||
            vpsDato.usuario !== localDato.usuario ||
            vpsDato.usuarioMod !== localDato.usuarioMod ||
            vpsDato.createdAt !== localDato.createdAt ||
            vpsDato.updatedAt !== localDato.updatedAt ||
            vpsDato.sucursalId !== localDato.sucursalId
          )
        });
        const create = vpsDatos.filter(vpsDatos => !localDatos.find(localDato => localDato.id === vpsDatos.id))
        return { update, create }
      })
    );
  }

  async update(datosDiferentes: Categoria[], tabla: string) {
    console.log(`Datos diferentes recibidos para actualizar: ${datosDiferentes}`)
    if (datosDiferentes.length === 0) {
      console.log(`No hay datos diferentes para actualizar`)
      return
    }
    const db = await this.sqlManagerService.getDbName()

    const sql = `UPDATE ${tabla} SET nombre=?, descripcion=?, habilitado=?, usuario=?, usuarioMod=?, createdAt=?, updatedAt=? WHERE id = ?`

    try {
      for (const datos of datosDiferentes) {
        let cambios = []

        if (datos.nombre !== undefined) cambios.push('nombre');
        if (datos.descripcion !== undefined) cambios.push('descripcion');
        if (datos.habilitado !== undefined) cambios.push('habilitado');
        if (datos.usuario !== undefined) cambios.push('usuario');
        if (datos.usuarioMod !== undefined) cambios.push('usuarioMod');
        if (datos.createdAt !== undefined) cambios.push('createdAt');
        if (datos.updatedAt !== undefined) cambios.push('updatedAt');
        if (datos.sucursalId !== undefined) cambios.push('sucursalId')

        await CapacitorSQLite.executeSet({
          database: db,
          set: [
            {
              statement: sql,
              values: [
                datos.nombre || null,
                datos.descripcion || null,
                datos.habilitado || null,
                datos.usuario || null,
                datos.usuarioMod || null,
                datos.createdAt || null,
                datos.updatedAt || null,
                datos.sucursalId || null
              ]
            }
          ]
        });
        if (cambios.length > 0) {
          console.log(`Categoria con id ${datos.id} actualizado con exito, ${cambios.join(', ')}`)
        } else {
          console.log(`Categoria con id ${datos.id} no requiere de actualizacion`)
        }
      }
    } catch (error) {
      console.error('Error al actualizar las Categoriaes: ', error)
    }
  }

  async create(datosParaCrear: Categoria[], tabla: string) {
    const db = await this.sqlManagerService.getDbName();
    const sql = `INSERT INTO ${tabla} (id, nombre, descripcion, habilitado, usuario, usuarioMod, createdAt, updatedAt, sucursalId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

    try {
      for (const datos of datosParaCrear) {
        const exsDatos = await CapacitorSQLite.query({
          database: db,
          statement: `SELECT id FROM ${tabla} WHERE id = ?`,
          values: [datos.id]
        })
        if (exsDatos.values.length === 0) {
          await CapacitorSQLite.executeSet({
            database: db,
            set: [{
              statement: sql,
              values: [
                datos.id,
                datos.nombre,
                datos.descripcion,
                datos.habilitado || 1,
                datos.usuario,
                datos.usuarioMod,
                datos.createdAt,
                datos.updatedAt,
                datos.sucursalId
              ]
            }]
          });
          console.log(`Categoria con id ${datos.id} creado exitosamente: ${datos}`)
        } else {
          console.log(`Categoria con id ${datos.id} ya existe, omitiendo la inserción`)
        }
      }
    } catch (error) {
      console.error('Error al crear nuevos datos: ', error)
    }
  }

  async sincronizar(endPoint: string, tabla: string) {
    try {
      const { update, create } = await lastValueFrom(this.comparacion(endPoint, tabla))

      if (update.length > 0) {
        await this.update(update, tabla)
        console.log(`Categoria actualizada con exito`)
      } else {
        console.log(`No hay datos que actualizar`)
      }

      if (create.length > 0) {
        await this.create(create, tabla)
        console.log('Datos de Categoria insertados correctamente')
      }

      if (update.length === 0 && create.length === 0) {
        console.log(`No hay cambios para aplicar`)
      }
    } catch (error) {
      console.error(`Error en la sincronizacion: ${error}`)
    }
  }

}
