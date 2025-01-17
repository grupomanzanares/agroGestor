import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { SqliteManagerService } from './sqlite-manager.service';
import { Finca } from '../models/finca';
import { forkJoin, from, lastValueFrom, map, Observable } from 'rxjs';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class FincaService {

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient, private sqlManagerService: SqliteManagerService) { }

  obtenerVps(endPoint: string): Observable<Finca[]> {
    return this.http.get<Finca[]>(`${this.apiUrl}${endPoint}`);
  }

  async obtenerDtLocal(tabla: string): Promise<Finca[]> {
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
          sigla: row.sigla,
          ccosto: row.ccosto,
          municipio: row.municipio,
          imagen: row.imagen,
          habilitado: row.habilitado,
          usuario: row.usuario,
          usuarioMod: row.usuarioMod,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        }));
        return datos
      } else {
        throw new Error("No se encontraron datos en la base de datos")
      }
    } catch (error) {
      console.error('Error al consultar los datos locales', error)
      throw error
    }
  }

  comparacion(endPoint: string, tabla: string): Observable <{ update: Finca[], create: Finca[] }>{
    return forkJoin({
      vpsDatos: this.obtenerVps(endPoint),
      localDatos: from(this.obtenerDtLocal(tabla))
    }).pipe(
      map(result => {
        const { vpsDatos, localDatos } = result

        if (localDatos.length === 0) {
          console.log('No hay datos locales, todos los datos del VPS seran creados')
          return { update: [], create: vpsDatos }
        }

        const update = vpsDatos.filter(vpsDato => {
          const localDato = localDatos.find(localDato => localDato.id === vpsDato.id)
          if(!localDato) return false

          return(
            vpsDato.nombre !== localDato.nombre ||
            vpsDato.descripcion !== localDato.descripcion ||
            vpsDato.sigla !== localDato.sigla ||
            vpsDato.ccosto !== localDato.ccosto ||
            vpsDato.municipio !== localDato.municipio ||
            vpsDato.imagen !== localDato.imagen ||
            vpsDato.habilitado !== localDato.habilitado ||
            vpsDato.usuario !== localDato.usuario ||
            vpsDato.usuarioMod !== localDato.usuarioMod ||
            vpsDato.createdAt !== localDato.createdAt ||
            vpsDato.updatedAt !== localDato.updatedAt
          );
        });

        const create = vpsDatos.filter(vpsDato => !localDatos.find(localDato => localDato.id === vpsDato.id));

        return { update, create }
      })
    );
  }

  async update(datosDiferentes: Finca[], tabla: string){
    console.log('Datos diiferentes recibidos: ', datosDiferentes)
    if (datosDiferentes.length === 0) {
      console.log('No hay datos diferentes para actualizar')
      return;
    }

    const db = await this.sqlManagerService.getDbName()

    const sql = `UPDATE ${tabla} SET nombre=?, descripcion=?, sigla=?, ccosto=?, municipio=?,
    imagen=?, habilitado=?, usuario=?, usuarioMod=?, createdAt=?, updatedAt=? WHERE id = ?`

    try {
      for (const datos of datosDiferentes) {
        let cambios = []

        if(datos.nombre !== undefined) cambios.push('nombre');
        if(datos.descripcion !== undefined) cambios.push('descripcion');
        if(datos.sigla !== undefined) cambios.push('sigla');
        if(datos.ccosto !== undefined) cambios.push('ccosto');
        if(datos.municipio !== undefined) cambios.push('municipio');
        if(datos.imagen !== undefined) cambios.push('imagen');
        if(datos.habilitado !== undefined) cambios.push('habilitado');
        if(datos.usuario !== undefined) cambios.push('usuario');
        if(datos.usuarioMod !== undefined) cambios.push('usuarioMod');
        if(datos.createdAt !== undefined) cambios.push('createdAt');
        if(datos.updatedAt !== undefined) cambios.push('updatedAt');

        await CapacitorSQLite.executeSet({
          database: db,
          set: [
            {
              statement: sql,
              values: [
                datos.nombre || null,
                datos.descripcion || null,
                datos.sigla || null,
                datos.ccosto || null,
                datos.municipio || null,
                datos.imagen || null,
                datos.habilitado || null,
                datos.usuario || null,
                datos.usuarioMod || null,
                datos.createdAt || null,
                datos.updatedAt || null
              ]
            }
          ]
        });

        if (cambios.length > 0) {
          console.log(`Finca con id ${datos.id} actualizado con exito, ${cambios.join(', ')}.`);
        }else{
          console.log(`Finca con id ${datos.id} no requiere de actualizacion.`);
        }
      }
    } catch (error) {
      console.error('Error al actualizar las Fincas: ', error)
    }
  }

  async create(datosParaCrear: Finca[], tabla: string){
    const db = await this.sqlManagerService.getDbName();
    const sql = `INSERT INTO ${tabla} (id, nombre, descripcion, sigla, ccosto, municipio, imagen, habilitado, usuario, usuarioMod, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

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
            set :[{
              statement: sql,
              values: [
                datos.id,
                datos.nombre,
                datos.descripcion,
                datos.sigla,
                datos.ccosto,
                datos.municipio,
                datos.imagen,
                datos.habilitado || 1,
                datos.usuario,
                datos.usuarioMod,
                datos.createdAt,
                datos.updatedAt
              ]
            }]
          });
          console.log(`Finca con id ${datos.id} creado exitosamente`, datos)
        } else {
          console.log(`Finca con id ${datos.id} ya existe, omitiendo la inserción.`);
        }
      }
    } catch (error) {
      console.error('Error al crear nuevos datos:', error)
    }
  }

  async sicronizarFinca(endPoint: string, tabla: string){
    try {
      const{ update, create } = await lastValueFrom(this.comparacion(endPoint, tabla));

      if(update.length > 0){
        await this.update(update, tabla)
        console.log('Finca actualizada correctamente')
      }else{
        console.log('No hay datos que actualizar')
      }

      if(create.length > 0){
        await this.create(create, tabla);
        console.log('Datos de finca insertados correctamente')
      }

      if (update.length === 0 && create.length === 0) {
        console.log('No hay cambios para aplicar.');
      }
    } catch (error) {
      console.error('Error en la sincronización:', error);
    }
  }
}
