import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { SqliteManagerService } from './sqlite-manager.service';
import { forkJoin, from, lastValueFrom, map, Observable } from 'rxjs';
import { Programacion } from '../models/programacion';
import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProgramacionService {

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient, private sqlService: SqliteManagerService, private auth: AuthService) { }

  obternerVps(endPoint: string): Observable<Programacion[]> {
    const token = localStorage.getItem('token')
    const id = localStorage.getItem('id')
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    })
    return this.http.get<Programacion[]>(`${this.apiUrl}${endPoint}/recientes?responsableId=${id}`, { headers })
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
          programacion: row.programacion,
          fecha: row.fecha,
          lote: row.lote,
          trabajador: row.trabajador,
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
          responsableId: row.responsableId,
          fincaId: row.fincaId,
          actividadId: row.actividadId,
          estadoId: row.estadoId,
          prioridadId: row.prioridadId
        }))
        // console.log('Programaciones obtenidas', datos)
        return datos;
      } else {
        throw new Error('No se encontraron datos de la programacion en la base de datos')
      }
    } catch (error) {
      console.error('Error al consultar a la base de datos', error)
      throw error
    }
  }

  async getMaxEjecucion(tabla: string, programacionId: number, signo: number | null = null): Promise<number> {
    let sql = `
      SELECT 
        MAX(p.id) AS maximo
      FROM 
        ${tabla} p
      WHERE sincronizado = 0
    `;

    const values: any[] = [];

    if (signo !== null) {
      sql += ` AND p.signo = ?`;
      values.push(signo);
    }

    if (programacionId !== null) {
      sql += ` AND p.programacion = ?`;
      values.push(programacionId);
    }

    const db = await this.sqlService.getDbName();

    try {
      const response = await CapacitorSQLite.query({
        database: db,
        statement: sql,
        values: values
      });

      const max = response.values?.[0]?.maximo;

      // Si hay registros, sumar 1 al máximo. Si no hay, usar programacionId * 1000 + 1
      if (max !== null && max !== undefined) {
        return Number(max) + 1;
      } else {
        return programacionId * 1000 + 1;
      }
    } catch (error) {
      console.error('Error al obtener el ID máximo:', error);
      throw error;
    }
  }


  async getProgramaciones(tabla: string, usuario: string | null = null, programacionId: number | null = null, signo: number | null = null): Promise<any[]> {
    let sql = `
      SELECT 
        p.id,
        p.programacion,
        DATE(p.fecha) AS fecha, 
        p.lote,
        p.jornal,
        p.cantidad,
        p.habilitado,
        p.sincronizado,
        p.fecSincronizacion,
        p.observacion,
        p.signo,
        p.maquina,
        p.usuario,
        p.usuarioMod,
        p.createdAt,
        p.updatedAt,
        p.actividadId,
        p.fincaId,
        p.sucursalId,
        p.responsableId,
        p.estadoId,
        p.prioridadId,
        p.trabajador,
        t.nombre AS trabajadorNombre,
        a.nombre AS actividadNombre,
        a.controlPorLote AS controlPorLote,
        a.controlPorTrabajador AS controlPorTrabajador,
        f.nombre AS fincaNombre,
        s.nombre AS sucursalNombre,
        u.name AS responsableNombre,
        e.nombre AS estadoNombre,
        pr.nombre AS prioridadNombre,
         (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', t.id, 'nombre', t.nombre))
          FROM programacion_trabajadores pt
          JOIN trabajador t ON pt.trabajadorId = t.id
          WHERE pt.programacionId = p.id) AS trabajadores
      FROM 
        ${tabla} p
      LEFT JOIN trabajador t ON p.trabajador = t.id
      LEFT JOIN actividad a ON p.actividadId = a.id
      LEFT JOIN finca f ON p.fincaId = f.id
      LEFT JOIN sucursal s ON p.sucursalId = s.id
      LEFT JOIN users u ON p.responsableId = u.id
      LEFT JOIN estado e ON p.estadoId = e.id
      LEFT JOIN prioridad pr ON p.prioridadId = pr.id
      WHERE 1=1`;

    const values: any[] = [];

    if (signo !== null) {
      sql += ` AND p.signo = ?`;
      values.push(signo);
    }

    if (usuario !== null) {
      sql += ` AND u.name = ?`;
      values.push(usuario);
    }

    if (programacionId !== null) {
      sql += ` AND p.programacion = ?`;
      values.push(programacionId);
    }

    const db = await this.sqlService.getDbName();

    try {
      const response = await CapacitorSQLite.query({
        database: db,
        statement: sql,
        values: values
      });

      if (response.values && response.values.length > 0) {
        const mesActual = new Date().getMonth() + 1;
        const anoActual = new Date().getFullYear();
        return response.values.map(row => ({
          id: row.id,
          programacion: row.programacion,
          fecha: row.fecha,
          lote: row.lote,
          trabajador: row.trabajador,
          jornal: row.jornal,
          cantidad: row.cantidad,
          habilitado: row.habilitado,
          sincronizado: row.sincronizado,
          fecSincronizacion: row.fecSincronizacion,
          observacion: row.observacion,
          signo: row.signo,
          maquina: row.maquina,
          usuario: row.usuario,
          usuarioMod: row.usuarioMod,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          actividadId: row.actividadId || null,
          fincaId: row.fincaId || null,
          sucursalId: row.sucursalId || null,
          responsableId: row.responsableId || null,
          estadoId: row.estadoId || null,
          prioridadId: row.prioridadId || null,
          trabajadorNombre: row.trabajadorNombre || 'Sin nombre',
          actividadNombre: row.actividadNombre || 'Sin nombre',
          controlPorLote: row.controlPorLote || 0,
          controlPorTrabajador: row.controlPorTrabajador || 0,
          fincaNombre: row.fincaNombre || 'Sin nombre',
          sucursalNombre: row.sucursalNombre || 'Sin nombre',
          responsableNombre: row.responsableNombre || 'Sin nombre',
          estadoNombre: row.estadoNombre || 'Sin nombre',
          prioridadNombre: row.prioridadNombre || 'Sin nombre',
          trabajadores: row.trabajadores ? JSON.parse(row.trabajadores) : []
        })).filter(row => {
          const [year, month] = row.fecha.split('-').map(Number);
          return year === anoActual && month === mesActual;
        });
      } else {
        console.warn('No se encontraron programaciones en la base de datos.');
        return [];
      }
    } catch (error) {
      console.error('Error al obtener programaciones:', error);
      throw error;
    }
  }

  comparacion(endPoint: string, tabla: string): Observable<{ update: Programacion[], create: Programacion[] }> {
    return forkJoin({
      vpsDatos: this.obternerVps(endPoint),
      localDatos: from(this.obtenerLocal(tabla))
    }).pipe(
      map(result => {
        const { vpsDatos, localDatos } = result;

        // console.log('Datos del VPS:', vpsDatos);
        // console.log('Datos locales:', localDatos);

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

  async updateEst(datosDiferentes: Programacion[], tabla: string) {

    if (datosDiferentes.length === 0) {
      console.log(`No hay datos diferentes para actualizar`);
      return;
    }

    const db = await this.sqlService.getDbName();
    const sql = ` UPDATE ${tabla} SET estadoId=?, usuarioMod=?, updatedAt=? WHERE id = ?`;

    try {
      for (const datos of datosDiferentes) {
        await CapacitorSQLite.executeSet({
          database: db,
          set: [
            {
              statement: sql,
              values: [
                datos.estadoId || null,
                datos.usuarioMod || null,
                datos.updatedAt || null,
                datos.id
              ]
            }]
        });
        console.log('Datos para actualizar', datos)
        console.log(`Programacion con id ${datos.id} actualizada con éxito`);
      }
    } catch (error) {
      console.error('Error al actualizar los datos:', error);
      throw error;
    }
  }


  async update(datosDiferentes: Programacion[], tabla: string) {
    console.log('Datos diferentes recibidos para actualizar:', JSON.stringify(datosDiferentes))
    if (datosDiferentes.length === 0) {
      console.log(`No hay datos diferente para actualizar`)
      return
    }
    const sql = `UPDATE ${tabla} SET fecha=?, lote=?, jornal=?, cantidad=?, habilitado=?, sincronizado=?, fecSincronizacion=?, observacion=?, signo=?, maquina=?, usuario=?, usuarioMod=?, createdAt=?, updatedAt=?, sucursalId=?, fincaId=?, actividadId=?, estadoId=?, prioridadId=? WHERE id = ?`
    const db = await this.sqlService.getDbName()

    try {
      for (const datos of datosDiferentes) {
        let cambios = []

        if (datos.fecha !== undefined) cambios.push('fecha');
        if (datos.programacion !== undefined) cambios.push('programacion');
        if (datos.lote !== undefined) cambios.push('lote');
        if (datos.trabajador !== undefined) cambios.push('trabajador');
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
        if (datos.sucursalId !== undefined) cambios.push('sucursalId');
        if (datos.responsableId !== undefined) cambios.push('responsableId')
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
                datos.programacion || null,
                datos.fecha || null,
                datos.lote || null,
                datos.trabajador || null,
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
                datos.responsableId || null,
                datos.fincaId || null,
                datos.actividadId || null,
                datos.estadoId || null,
                datos.prioridadId || null
              ]
            }
          ]
        })
        if (cambios.length > 0) {
          console.log(cambios)
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
      (id, programacion, fecha, lote, jornal, cantidad, habilitado, sincronizado, fecSincronizacion, observacion, signo, maquina, usuario, usuarioMod, createdAt, updatedAt, sucursalId, responsableId, fincaId, actividadId, estadoId, prioridadId) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
      // 1. Crear la tabla si no existe
      await CapacitorSQLite.execute({
        database: db,
        statements: `CREATE TABLE IF NOT EXISTS programacion_trabajadores ( id INTEGER PRIMARY KEY AUTOINCREMENT, programacionId INTEGER NOT NULL, 
                    trabajadorId INTEGER NOT NULL, sincronizacion INTEGER DEFAULT 0);`
      });

      for (const datos of datosParaCrear) {
        console.log('Datos que llegan a create()', datos);
        const exsDatos = await CapacitorSQLite.query({
          database: db,
          statement: `SELECT id FROM ${tabla} WHERE id = ?`,
          values: [datos.id]
        });

        if (exsDatos.values.length === 0) {
          // 👉 Insertar en tabla "programacion"
          await CapacitorSQLite.executeSet({
            database: db,
            set: [{
              statement: sql,
              values: [
                datos.id,
                datos.programacion,
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
                datos.responsableId,
                datos.fincaId,
                datos.actividadId,
                datos.estadoId,
                datos.prioridadId
              ]
            }]
          });

          // 👉 Insertar en tabla "programacion_trabajadores"
          if (Array.isArray(datos.trabajadores)) {


            //Borramos datos por  ${datos.id} para asegurarnos de que no hay datos por esa programacion
            // await CapacitorSQLite.execute({
            //   database: db,
            //   statements: `
            //       DELETE FROM programacion_trabajadores WHERE programacionId = ${datos.id};
            //     `
            // });

            if (Array.isArray(datos.trabajadores)) {
              await CapacitorSQLite.execute({
                database: db,
                statements: `DELETE FROM programacion_trabajadores WHERE programacionId = ${datos.id};`
              });
              for (const trabajador of datos.trabajadores) {
                await CapacitorSQLite.executeSet({
                  database: db,
                  set: [{
                    statement: `
                      INSERT INTO programacion_trabajadores (programacionId, trabajadorId, sincronizado)
                      VALUES (?, ?, ?);`,
                    values: [datos.id, trabajador.trabajadorId, 0]
                  }]
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error al crear nuevos datos: ', error);
    }
  }

  async createVPS(datosParaCrear: Programacion[], tabla: string) {
    const db = await this.sqlService.getDbName();
    const sql = `INSERT INTO ${tabla} 
      (id, programacion, fecha, lote, jornal, cantidad, habilitado, sincronizado, fecSincronizacion, observacion, signo, maquina, usuario, usuarioMod, createdAt, updatedAt, sucursalId, responsableId, fincaId, actividadId, estadoId, prioridadId) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
      // 1. Crear la tabla si no existe
      await CapacitorSQLite.execute({
        database: db,
        statements: `CREATE TABLE IF NOT EXISTS programacion_trabajadores ( id INTEGER PRIMARY KEY AUTOINCREMENT, programacionId INTEGER NOT NULL, 
                    trabajadorId INTEGER NOT NULL, sincronizacion INTEGER DEFAULT 0);`
      });

      for (const datos of datosParaCrear) {
        console.log('Datos que llegan a create()', datos);
        const exsDatos = await CapacitorSQLite.query({
          database: db,
          statement: `SELECT id FROM ${tabla} WHERE id = ?`,
          values: [datos.id]
        });

        if (exsDatos.values.length === 0) {
          // 👉 Insertar en tabla "programacion"
          await CapacitorSQLite.executeSet({
            database: db,
            set: [{
              statement: sql,
              values: [
                datos.id,
                datos.programacion,
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
                datos.responsableId,
                datos.fincaId,
                datos.actividadId,
                datos.estadoId,
                datos.prioridadId
              ]
            }]
          });
        }

        if (Array.isArray(datos.trabajadores)) {
          const trabajadoresConvertidos = datos.trabajadores.map(t => ({
            trabajadorId: t.trabajadorId ?? t.id
          }));

          for (const trabajador of trabajadoresConvertidos) {
            if (trabajador.trabajadorId != null) {
              await CapacitorSQLite.executeSet({
                database: db,
                set: [{
                  statement: `
                    INSERT INTO programacion_trabajadores (programacionId, trabajadorId, sincronizado)
                    VALUES (?, ?, ?);`,
                  values: [datos.id, trabajador.trabajadorId, 1]
                }]
              });
            } else {
              console.warn(`Trabajador inválido para la programación ${datos.id}:`, trabajador);
            }
          }
        }

        console.log('Programación insertada en VPS local:', {
          id: datos.id,
          programacion: datos.programacion,
          fecha: datos.fecha,
          fincaId: datos.fincaId,
          actividadId: datos.actividadId,
          trabajadores: datos.trabajadores || []
        });
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
        await this.createVPS(create, tabla)
        console.log('Datos de la programacion insertados correctamente')
      }

      if (update.length === 0 && create.length === 0) {
        console.log('No hay cambios para aplicar')
      }
    } catch (error) {
      console.error(`Error en la sincronizacion: ${error}`)
    }
  }

  async updateId(datos: any[], tabla: string) {

    const db = await this.sqlService.getDbName();
    const sql = `UPDATE ${tabla} SET id = ?, sincronizado = 1 WHERE id = ?`

    try {
      const updates = datos.map(dato => ({
        statement: sql,
        values: [dato.nuevoId, dato.idLocal] // Asegúrate de que estos valores estén bien asignados
      }));

      await CapacitorSQLite.executeSet({
        database: db,
        set: updates
      });
    } catch (error) {
      console.error('Error al actualizar los datos:', error);
      throw error;
    }
  }

  async updateIdTrabajadores(datos: any[], tabla: string) {

    const db = await this.sqlService.getDbName();
    const sql = `UPDATE ${tabla} SET programacionId = ? WHERE programacionId = ?`

    try {
      const updates = datos.map(dato => ({
        statement: sql,
        values: [dato.nuevoId, dato.idLocal] // Asegúrate de que estos valores estén bien asignados
      }));

      await CapacitorSQLite.executeSet({
        database: db,
        set: updates
      });
    } catch (error) {
      console.error('Error al actualizar los datos:', error);
      throw error;
    }
  }
}
