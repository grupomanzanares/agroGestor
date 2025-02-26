import { Injectable } from '@angular/core';
import { SqliteManagerService } from './sqlite-manager.service';
import { environment } from 'src/environments/environment.prod';
import { HttpClient } from '@angular/common/http';
import { forkJoin, lastValueFrom, map, Observable } from 'rxjs';
import { Identificacion } from '../models/tipoIdent';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class IdentificacionService {

  apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private sqliteManagerService: SqliteManagerService) { }

  // Obtener datos desde el VPS
  obtenerVps(endPoint: string): Observable<Identificacion[]> {
    return this.http.get<Identificacion[]>(`${this.apiUrl}${endPoint}`);
  }

  // Obtener datos locales desde db.json
  async obtenerDtLocal(tabla: string): Promise<Identificacion[]> {
    const db = await this.sqliteManagerService.getDbName();
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
          codigo: row.codigo,
          nombre: row.nombre,
          descripcion: row.descripcion,
          habilitado: row.habilitado,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          usuario: row.usuario,
          usuarioMod: row.usuarioMod
        }));
        return datos
      }else{
        throw new Error("No se encontraron datos en la base de datos.");
      }
    } catch (error) {
      console.error('Error al consultar los datos locales', error);
      throw error;
    }
  }

  // Comparar los datos obtenidos del VPS con los datos locales
  comparacion(endPoint: string, tabla: string): Observable<{ update: Identificacion[], create: Identificacion[] }> {
    return forkJoin({
      vpsDatos: this.obtenerVps(endPoint),
      localDatos: this.obtenerDtLocal(tabla)
    }).pipe(
      map(result => {
        const { vpsDatos, localDatos } = result;

        if (localDatos.length === 0) {
          console.log('No hay datos locales, todos los datos del VPS serán creados.');
          return { update: [], create: vpsDatos };
        }
  
        
        // Encontrar datos que necesitan actualizarse
        const update = vpsDatos.filter(vpsDato => {
          const localDato = localDatos.find(localDato => localDato.id === vpsDato.id);
          if (!localDato) return false;
          
          return (
            vpsDato.codigo !== localDato.codigo ||
            vpsDato.nombre !== localDato.nombre || 
            vpsDato.descripcion !== localDato.descripcion ||
            vpsDato.habilitado !== localDato.habilitado ||
            vpsDato.createdAt !== localDato.createdAt ||
            vpsDato.updatedAt !== localDato.updatedAt ||
            vpsDato.usuario !== localDato.usuario ||
            vpsDato.usuarioMod !== localDato.usuarioMod
          );
        });

        // Encontrar datos que necesitan crearse
        const create = vpsDatos.filter(vpsDato => !localDatos.find(localDato => localDato.id === vpsDato.id));

        return { update, create };
      })
    );
  }
  

  // Función para actualizar los datos con diferencias
  async update(datosDiferentes: Identificacion[], tabla: string) {
    console.log('Datos diferentes recibidos:', datosDiferentes);
    if (datosDiferentes.length === 0) {
      console.log('No hay datos diferentes para actualizar.');
      return;
    }
    
    const db = await this.sqliteManagerService.getDbName();
    
    const sql = `UPDATE ${tabla} SET codigo = ?, nombre = ?, descripcion = ?, habilitado = ?, createdAt = ?, updatedAt = ?, usuario = ?, usuarioMod = ? WHERE id = ?`;
  
    try {
      for (const datos of datosDiferentes) {
        // Compara los campos y construye el mensaje personalizado
        let cambios = [];
        if (datos.codigo !== undefined) cambios.push('codigo');
        if (datos.nombre !== undefined) cambios.push('nombre');
        if (datos.descripcion !== undefined) cambios.push('descripcion');
        if (datos.habilitado !== undefined) cambios.push('habilitado');
        if (datos.createdAt !== undefined) cambios.push('createdAt');
        if (datos.updatedAt !== undefined) cambios.push('updatedAt');
        if (datos.usuario !== undefined) cambios.push('usuario');
        if (datos.usuarioMod !== undefined) cambios.push('usuarioMod');
  
        // Ejecutar la actualización
        await CapacitorSQLite.executeSet({
          database: db,
          set: [
            {
              statement: sql,
              values: [
                datos.codigo || null, 
                datos.nombre || null, 
                datos.descripcion || null, 
                datos.habilitado || 1, 
                datos.createdAt || null, 
                datos.updatedAt || null, 
                datos.usuario || null, 
                datos.usuarioMod || null, 
                datos.id
              ]
            }
          ]
        });
  
        // Genera el mensaje basado en los cambios
        if (cambios.length > 0) {
          console.log(`Datos con id ${datos.id} actualizado exitosamente. Campos actualizados: ${cambios.join(', ')}.`);
        } else {
          console.log(`Datos con id ${datos.id} no requiere actualización.`);
        }
      }
    } catch (error) {
      console.error('Error al actualizar los Datos:', error);
    }
  }

  async create(datosParaCrear: Identificacion[], tabla: string) {
    const db = await this.sqliteManagerService.getDbName();
    const sql = `INSERT INTO ${tabla} (id, codigo, nombre, descripcion, habilitado, usuario, createdAt, updatedAt, usuarioMod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
      for (const datos of datosParaCrear) {

        const exsDatos = await CapacitorSQLite.query({
          database: db,
          statement: `SELECT id FROM ${tabla} WHERE id = ?`,
          values: [datos.id]
        })

        if (exsDatos.values.length === 0) {
          // Si no existe, insertamos el datos
          await CapacitorSQLite.executeSet({
            database: db,
            set: [{
              statement: sql,
              values: [
                datos.id, 
                datos.codigo, 
                datos.nombre, 
                datos.descripcion, 
                datos.habilitado || 1, 
                datos.usuario, 
                datos.createdAt, 
                datos.updatedAt, 
                datos.usuarioMod
              ]
            }]
          });
          console.log(`Dato con id ${datos.id} creado exitosamente.`, datos);
        } else {
          console.log(`Dato con id ${datos.id} ya existe, omitiendo la inserción.`);
        }
      }
    } catch (error) {
      console.error('Error al crear nuevos datos:', error);
    }
  }

  async sincronizar(endPoint: string, tabla: string) {
    try {
      const { update, create } = await lastValueFrom(this.comparacion(endPoint, tabla));

      if (update.length > 0) {
        await this.update(update, tabla);
        console.log('Datos actualizados correctamente.');
      }else{
        console.log('No hay datos que actualizar')
      }

      if (create.length > 0) {
        await this.create(create, tabla);
        console.log('Datos nuevos insertados correctamente.');
      }

      if (update.length === 0 && create.length === 0) {
        console.log('No hay cambios para aplicar.');
      }
    } catch (error) {
      console.error('Error en la sincronización:', error);
    }
  }
}
