import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { SqliteManagerService } from './sqlite-manager.service';
import { forkJoin, from, lastValueFrom, map, Observable } from 'rxjs';
import { Actividad } from '../models/actividad';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class ActividadService {

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient, private sqlManagerService: SqliteManagerService) { }

  obtenerVps(endPoint: string): Observable<Actividad[]> {
    const token = localStorage.getItem('token')
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    })
    return this.http.get<Actividad[]>(`${this.apiUrl}${endPoint}`, { headers })
  }

  async obtenerLocal(tabla: string): Promise<Actividad[]> {
    const db = await this.sqlManagerService.getDbName();
    const sql = `SELECT * FROM ${tabla}`;
  
    try {
      const result = await CapacitorSQLite.query({
        database: db,
        statement: sql,
        values: []
      });
  
      // console.log('Resultado de la consulta local:', result);
  
      if (result.values) {
        const datos = result.values.map(row => ({
          id: row.id,
          nombre: row.nombre,
          descripcion: row.descripcion,
          controlPorLote: row.controlPorLote,
          controlPorTrabajador: row.controlPorTrabajador,
          habilitado: row.habilitado,
          usuario: row.usuario,
          usuarioMod: row.usuarioMod,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          unidadId: row.unidadId,
          subCategoriaId: row.subCategoriaId
        }));
        // console.log('Datos procesados localmente:', datos);
        return datos;
      } else {
        throw new Error('No se encontraron datos en la base de datos local');
      }
    } catch (error) {
      console.error('Error al consultar los datos locales:', error);
      throw error;
    }
  }  

  comparacion(endPoint: string, tabla: string): Observable<{ update: Actividad[], create: Actividad[] }> {
    return forkJoin({
      vpsDatos: this.obtenerVps(endPoint),
      localDatos: from(this.obtenerLocal(tabla))
    }).pipe(
      map(result => {
        const { vpsDatos, localDatos } = result;
  
        // console.log('Datos del VPS:', vpsDatos);
        // console.log('Datos locales:', localDatos);
  
        if (localDatos.length === 0) {
          console.log('No hay datos locales, todos los datos del VPS serán creados');
          return { update: [], create: vpsDatos };
        }
  
        const update = vpsDatos.filter(vpsDato => {
          const localDato = localDatos.find(localDato => localDato.id === vpsDato.id);
          if (!localDato) return false;
  
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
          );
        });
  
        const create = vpsDatos.filter(vpsDato => !localDatos.some(localDato => localDato.id === vpsDato.id));
  
        return { update, create };
      })
    );
  }

  async update(datosDiferentes: Actividad[], tabla: string) {
    console.log('Datos diferentes recibidos para actualizar:', datosDiferentes)
    if (datosDiferentes.length === 0) {
      console.log(`No hay datos diferentes para actualizar`)
      return
    }
    const db = await this.sqlManagerService.getDbName()
    const sql = `UPDATE ${tabla} SET nombre=?, descripcion=?, controlPorLote=?, controlPorTrabajador=?, habilitado=?, usuario=?, usuarioMod=?, createdAt=?, updatedAt=?, unidadId=?, subCategoriaId=? WHERE id = ?`

    try {
      for (const datos of datosDiferentes) {
        let cambios = []

        if (datos.nombre !== undefined) cambios.push('nombre');
        if (datos.descripcion !== undefined) cambios.push('descripcion');
        if (datos.controlPorLote !== undefined) cambios.push('controlPorLote');
        if (datos.controlPorTrabajador !== undefined) cambios.push('controlPorTrabajador');
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
        if (cambios.length > 0) {
          console.log(`Actividad con id ${datos.id} actializada correctamente`)
        } else {
          console.log(`Actividad con id ${datos.id} no requiere de actualizacion`)
        }
      }
    } catch (error) {
      console.error('Error al actualizar las actividades: ', error)
    }
  }

  async create(datosParaCrear: Actividad[], tabla: string) {
    const db = await this.sqlManagerService.getDbName();
    const sql = `INSERT INTO ${tabla} (id, nombre, descripcion, controlPorLote, controlPorTrabajador, habilitado, usuario, usuarioMod, createdAt, updatedAt, unidadId, subCategoriaId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
    try {
      for (const datos of datosParaCrear) {
        // console.log('Intentando insertar:', datos);
  
        const exsDatos = await CapacitorSQLite.query({
          database: db,
          statement: `SELECT id FROM ${tabla} WHERE id = ?`,
          values: [datos.id]
        });
  
        if (exsDatos.values && exsDatos.values.length === 0) {
          await CapacitorSQLite.executeSet({
            database: db,
            set: [{
              statement: sql,
              values: [
                datos.id,
                datos.nombre,
                datos.descripcion,
                datos.controlPorLote,
                datos.controlPorTrabajador,
                datos.habilitado || 1,
                datos.usuario,
                datos.usuarioMod,
                datos.createdAt,
                datos.updatedAt,
                datos.unidadId,
                datos.subCategoriaId
              ]
            }]
          });
          // console.log(`Actividad con id ${datos.id} creada exitosamente`);
        } else {
          // console.log(`Actividad con id ${datos.id} ya existe, omitiendo la inserción`);
        }
      }
    } catch (error) {
      console.error('Error al crear nuevos datos:', error);
    }
  }

  async sincronizar(endPoint: string, tabla: string) {
    try {
      const { update, create } = await lastValueFrom(this.comparacion(endPoint, tabla));
  
      // console.log('Datos para actualizar:', update);
      // console.log('Datos para crear:', create);
  
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
