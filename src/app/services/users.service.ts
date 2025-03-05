import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { SqliteManagerService } from './sqlite-manager.service';
import { catchError, forkJoin, from, lastValueFrom, map, Observable, throwError } from 'rxjs';
import { Users } from '../models/users';
import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { Router } from '@angular/router';
// import * as bcrypt from 'bcryptjs';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  apiUrl = environment.apiUrl
  public token: string | null = null;
  private credentials: { identificacion: number; password: string } | null = null;

  constructor(private http: HttpClient, private sqlManagerService: SqliteManagerService, private router: Router) { }

  obtenerVps(endPoint: string): Observable<Users[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  
    return this.http.get<Users[]>(`${this.apiUrl}${endPoint}`, { headers }).pipe(
      map((users) => {
        return users.map((user) => {
          if (!user.password) {
            console.warn(`El usuario ${user.identificacion} no tiene un password válido.`);
            return user;
          }
  
          console.log('Contraseña encriptada recibida:', user.password);
  
          // Guardamos la contraseña encriptada en el localStorage
          localStorage.setItem(`user_${user.identificacion}`, JSON.stringify(user));
  
          return user;
        });
      }),
      catchError((error) => {
        console.error('Error al obtener datos del VPS:', error);
        return throwError(() => new Error('Error al obtener datos del VPS.'));
      })
    );
  }

  // obtenerVps(endPoint: string): Observable<Users[]> {
  //   const token = localStorage.getItem('token')
  //   const headers = new HttpHeaders({
  //     Authorization: `Bearer ${token}`
  //   })
  //   return this.http.get<Users[]>(`${this.apiUrl}${endPoint}`, { headers }).pipe(
  //     map((users) => {
  //       return users.map((user) => {
  //         if (!user.password) {
  //           console.warn(`El usuario ${user.identificacion} no tiene un password válido.`);
  //           return user;
  //         }
  //         console.log(user.password)
  //         const decrypted = this.desencriptar(user.password)
  //         return { ...user, password: decrypted }
  //       })
  //     }),
  //     catchError((error) => {
  //       console.error('Error al obtener datos del VPS:', error);
  //       return throwError(() => new Error('Error al obtener datos del VPS.'));
  //     })
  //   )
  // }

  // desencriptar(encryptedText: string): string {
  //   try {
  //     if (!encryptedText) {
  //       console.warn('El texto encriptado está vacío o es inválido.');
  //       return encryptedText; // Retorna el texto original si está vacío
  //     }

  //     const secretKey = environment.secretKey; // Clave compartida con la API
  //     const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);

  //     // Verifica que los datos desencriptados sean válidos
  //     const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
  //     if (!decryptedText) {
  //       console.warn('No se pudo desencriptar el texto. Retornando el dato original.');
  //       return encryptedText;
  //     }

  //     return decryptedText;
  //   } catch (error) {
  //     console.error('Error al desencriptar:', error.message);
  //     return encryptedText; // Retorna el texto original en caso de error
  //   }
  // } 

  async obtenerDtLocal(tabla: string): Promise<Users[]> {
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
          identificacion: row.identificacion,
          name: row.name,
          email: row.email,
          celphone: row.celphone,
          password: row.password,
          state: row.state,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          rolId: row.rolId
        }));
        return datos
      } else {
        throw new Error("No se encontraron datos en la base de datos")
      }
    } catch (error) {
      console.error('Error al consultar los datos de los usuarios:', error)
      throw error
    }
  }

  comparacion(endPoint: string, tabla: string): Observable<{ update: Users[], create: Users[] }> {
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
          if (!localDato) return false

          return (
            vpsDato.identificacion !== localDato.identificacion ||
            vpsDato.name !== localDato.name ||
            vpsDato.email !== localDato.email ||
            vpsDato.celphone !== localDato.celphone ||
            vpsDato.password !== localDato.password ||
            vpsDato.state !== localDato.state ||
            vpsDato.createdAt !== localDato.createdAt ||
            vpsDato.updatedAt !== localDato.updatedAt ||
            vpsDato.rolId !== localDato.rolId
          )
        })

        const create = vpsDatos.filter(vpsDato => !localDatos.find(localDato => localDato.id === vpsDato.id));

        return { update, create }
      })
    );
  }

  async update(datosDiferentes: Users[], tabla: string) {
    console.log('Datos diferentes recibidos ', datosDiferentes)
    if (datosDiferentes.length === 0) {
      console.log('No hay datos diferentes para actualizar')
      return;
    }

    const db = await this.sqlManagerService.getDbName()
    const sql = `UPDATE ${tabla} SET identificacion=?, name=?, email=?, celphone=?, password=?, state=?, createdAt=?, updatedAt=? WHERE id = ?`

    try {
      for (const datos of datosDiferentes) {
        let cambios = []

        if (datos.identificacion !== undefined) cambios.push('identificacion');
        if (datos.name !== undefined) cambios.push('name');
        if (datos.email !== undefined) cambios.push('email');
        if (datos.celphone !== undefined) cambios.push('celphone');
        if (datos.password !== undefined) cambios.push('password');
        if (datos.state !== undefined) cambios.push('state');
        if (datos.createdAt !== undefined) cambios.push('createdAt');
        if (datos.updatedAt !== undefined) cambios.push('updatedAt');

        await CapacitorSQLite.executeSet({
          database: db,
          set: [
            {
              statement: sql,
              values: [
                datos.identificacion || null,
                datos.name || null,
                datos.email || null,
                datos.celphone || null,
                datos.password || null,
                datos.state || null,
                datos.createdAt || null,
                datos.updatedAt || null,
                datos.rolId || null
              ]
            }
          ]
        });

        if (cambios.length > 0) {
          console.log(`Usuario con id ${datos.id} actualizado con exito, ${cambios.join(', ')}`)
        } else {
          console.log(`Usuario con id ${datos.id} no requiere de actualizacion`)
        }
      }
    } catch (error) {
      console.error('Error al actualizar los usuarios: ', error)
    }
  }

  async create(datosParaCrear: Users[], tabla: string) {
    const db = await this.sqlManagerService.getDbName()
    const sql = `INSERT INTO ${tabla} (id, identificacion, name, email, celphone, password, state, createdAt, updatedAt, rolId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

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
                datos.identificacion,
                datos.name,
                datos.email,
                datos.celphone,
                datos.password,
                datos.state,
                datos.createdAt,
                datos.updatedAt,
                datos.rolId
              ]
            }]
          });
          // console.log(`Usuario con id ${datos.id} creado exitosamente `, datos)
        } else {
          console.log(`Usuario con id ${datos.id} ya existe, omitiendo la isercion`)
        }
      }
    } catch (error) {

      console.error('Error al crear nuevos datos:', error)
    }
  }

  setCredentials(credentials: { identificacion: number; password: string }): void {
    this.credentials = credentials;
  }

  getCredentials(): { identificacion: number; password: string } | null {
    return this.credentials;
  }

  async sincronizarUsers(endPoint: string, tabla: string) {
    try {
      const { update, create } = await lastValueFrom(this.comparacion(endPoint, tabla));

      if (update.length > 0) {
        await this.update(update, tabla)
      } else {
        console.log('No hay datos que actualizar')
      }

      if (create.length > 0) {
        await this.create(create, tabla)
      }

      if (update.length === 0 && create.length === 0) {
        console.log('No hay cambios para aplicar.');
      }

    } catch (error) {
      console.error('Error en la sincronización:', error);
    }
  }

}
