import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, from, lastValueFrom, map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { SqliteManagerService } from './sqlite-manager.service';
import { FincaLotes } from '../models/fincalotes';

@Injectable({
  providedIn: 'root'
})
export class FincaslotesService {

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient, private sqliteManagerService: SqliteManagerService) { }

  obtenerVps(endPoint: string): Observable<FincaLotes[]> {
    return this.http.get<FincaLotes[]>(`${this.apiUrl}${endPoint}`);
  }

  async obtenerDtLocal(tabla: string): Promise<FincaLotes[]> {
    const db = await this.sqliteManagerService.getDbName()
    const sql = `SELECT * FROM ${tabla}`

    try {
      const result = await CapacitorSQLite.query({
        database: db,
        statement: sql,
        values: []
      });
      if (result.values) {
        const datos = await result.values.map(row => ({
          lote: row.lote,
          ccosto: row.ccosto,
          nombre: row.nombre,
          descripcion: row.descripcion,
          area: row.area,
          plantas: row.plantas,
          imagen: row.imagen,
          habilitado: row.habilitado,
          usuario: row.usuario,
          usuarioMod: row.usuarioMod,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          finca: row.finca
        }));
        return datos
      }else{
        throw new Error("No se encontraron datos en la basae de datos")
      }
    } catch (error) {
      console.error('Error al consultar los datos locales', error);
      throw error;
    }
  }

  comparacion(endPoint: string, tabla: string): Observable<{ update: FincaLotes[], create: FincaLotes[] }>{
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
          const localDato = localDatos.find(localDato => localDato.lote === vpsDato.lote)
          if (!localDato) return false

          return(
            vpsDato.lote !== localDato.lote ||
            vpsDato.ccosto !== localDato.ccosto ||
            vpsDato.nombre !== localDato.nombre ||
            vpsDato.descripcion !== localDato.descripcion ||
            vpsDato.area !== localDato.area ||
            vpsDato.plantas !== localDato.plantas ||
            vpsDato.imagen !== localDato.imagen ||
            vpsDato.habilitado !== localDato.habilitado ||
            vpsDato.usuario !== localDato.usuario ||
            vpsDato.usuarioMod !== localDato.usuarioMod ||
            vpsDato.createdAt !== localDato.createdAt ||
            vpsDato.updatedAt !== localDato.updatedAt ||
            vpsDato.finca !== localDato.finca
          );
        });

        const create = vpsDatos.filter(vpsDato => !localDatos.find(localDato => localDato.lote === vpsDato.lote));

        return { update, create }
      })
    );
  }

  async update(datosDiferentes: FincaLotes[], tabla: string){
    console.log('Datos diiferentes recibidos: ', datosDiferentes)
    if (datosDiferentes.length === 0) {
      console.log('No hay datos diferentes para actualizar')
      return;
    }

    const db = await this.sqliteManagerService.getDbName();

    const sql = `UPDATE ${tabla} SET ccosto=?, nombre=?, descripcion=?, area=?, plantas=?, imagen=?, habilitado=?, usuario=?, usuarioMod=?, createdAt=?, updatedAt=? WHERE finca = ? AND lote = ? `

    try {
      for (const datos of datosDiferentes) {
        let cambios = []

        if(datos.ccosto !== undefined) cambios.push('ccosto');
        if(datos.nombre !== undefined) cambios.push('nombre');
        if(datos.descripcion !== undefined) cambios.push('descripcion');
        if(datos.area !== undefined) cambios.push('area');
        if(datos.plantas !== undefined) cambios.push('plantas');
        if(datos.imagen !== undefined) cambios.push('imagen');
        if(datos.habilitado !== undefined) cambios.push('habilitado');
        if(datos.usuario !== undefined) cambios.push('usuario');
        if(datos.usuarioMod !== undefined) cambios.push('usuarioMod');
        if(datos.createdAt !== undefined) cambios.push('createdAt');
        if(datos.updatedAt !== undefined) cambios.push('updatedAt');
        if(datos.finca !== undefined) cambios.push('finca');

        await CapacitorSQLite.executeSet({
          database: db,
          set: [
            {
              statement: sql,
              values: [
                datos.ccosto || null,
                datos.nombre || null,
                datos.descripcion || null,
                datos.area || null,
                datos.plantas || null,
                datos.habilitado || null,
                datos.usuario || null,
                datos.usuarioMod || null,
                datos.createdAt || null,
                datos.updatedAt || null,
                datos.finca || null
              ]
            }
          ]
        });

        if (cambios.length > 0) {
          console.log(`Lote con id ${datos.lote} actualizado con exito, ${cambios.join(', ')}.`);
        }else{
          console.log(`Lote con id ${datos.lote} no requiere de actualizacion.`);
        }
      }
    } catch (error) {
      console.error('Error al actualizar los Lotes: ', error)
    }
  }

  async create(datosParaCrear: FincaLotes[], tabla: string){
    const db = await this.sqliteManagerService.getDbName();
    const sql = `INSERT INTO ${tabla} (lote, ccosto, nombre, descripcion, area, plantas, imagen, habilitado, usuario, usuarioMod, createdAt, updatedAt, finca) VALUES  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

    try {
      for (const datos of datosParaCrear) {
        const exsDatos = await CapacitorSQLite.query({
          database: db,
          statement: `SELECT lote FROM ${tabla} WHERE finca = ? AND lote = ?`,
          values: [datos.finca, datos.lote ]
        });

        if(exsDatos.values.length === 0){
          await CapacitorSQLite.executeSet({
            database: db,
            set:[{
              statement: sql,
              values:[
                datos.lote,
                datos.ccosto, 
                datos.nombre,
                datos.descripcion,
                datos.area,
                datos.plantas,
                datos.imagen,
                datos.habilitado || 1,
                datos.usuario,
                datos.usuarioMod,
                datos.createdAt,
                datos.updatedAt,
                datos.finca
              ]
            }]
          });
          console.log(`Lote con id ${datos.lote} creado exitosamente `, datos)
        } else {
          console.log(`Lote con id ${datos.lote} ya existe, omitiendo la inserción.`);
        }
      }
    } catch (error) {
      console.error('Error al crear nuevos lotes:', error)
    }
  }

  async sincronizarLote(endPoint: string, tabla: string){
    try {
      const { update, create } = await lastValueFrom(this.comparacion(endPoint, tabla));

      if(update.length > 0){
        await this.update(update, tabla)
        console.log('Lote actualizado correctamente')
      }else{
        console.log('No hay datos que actualizar')
      }

      if(create.length > 0){
        await this.create(create, tabla);
        console.log('Datos de lote insertados correctamente')
      }

      if (update.length === 0 && create.length === 0) {
        console.log('No hay cambios para aplicar.');
      }
    } catch (error) {
      console.error('Error en la sincronizacion: ', error)
    }
  }

}
