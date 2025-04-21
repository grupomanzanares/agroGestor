import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { SqliteManagerService } from './sqlite-manager.service';
import { Programacion } from '../models/programacion';
import { forkJoin, lastValueFrom, map, Observable } from 'rxjs';
import { Proma_Trabajador } from '../models/promatrabajador';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class PromatrabajadorService {

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient, private sqlService: SqliteManagerService) { }

  obternerVps(endPoint: string): Observable<Proma_Trabajador[]> {
    const token = localStorage.getItem('token')
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    })
    return this.http.get<Proma_Trabajador[]>(`${this.apiUrl}${endPoint}`, { headers })
  }

  async obtenerLocal(tabla: string): Promise<Proma_Trabajador[]> {
    const db = await this.sqlService.getDbName()
    const sql = `SELECT * FROM ${tabla} WHERE sincronizacion = 0`

    try {
      const result = await CapacitorSQLite.query({
        database: db,
        statement: sql,
        values: []
      });

      if (result.values) {
        const datos = await result.values.map(row => ({
          programacionId: row.programacionId,
          trabajadorId: row.trabajadorId,
          sincronizacion: row.sincronizacion
        }))
        return datos
      } else {
        throw new Error('No se encontraron datos')
      }
    } catch (error) {
      console.error('Error al consultar', error)
      throw error
    }
  }

  async sincronizar(endPoint: string, tabla: string) {
    try {
      const trabajadores = await this.obtenerLocal(tabla)
      const programacionId = trabajadores[0].programacionId

      if (trabajadores.length === 0) {
        console.log('No hay datos para crear')
        return
      }

      console.log('Datos que se van a subir al VPS:', trabajadores);


      const payload = {
        programacionId,
        trabajadores
      };

     

      const token = localStorage.getItem('token')
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const response = await lastValueFrom(
        this.http.post(`${this.apiUrl}${endPoint}/create  `, payload, { headers })
      );

      const db = await this.sqlService.getDbName()
      for (const item of trabajadores) {
        await CapacitorSQLite.execute({
          database: db,
          statements: `UPDATE ${tabla} SET sincronizacion = 1 WHERE programacionId = ${item.programacionId} AND trabajadorId = ${item.trabajadorId}`
        })
      }
    } catch (error) {
      console.error('Error al sincronizar datos', error)
      throw error
    }
  }

}
