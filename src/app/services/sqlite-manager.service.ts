import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CapacitorSQLite, capSQLiteChanges, capSQLiteValues, JsonSQLite } from '@capacitor-community/sqlite';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { AlertController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { UsersService } from './users.service';
import { Users } from '../models/users';
import { Programacion } from '../models/programacion';


@Injectable({
  providedIn: 'root'
})
export class SqliteManagerService {

  private isWeb: boolean;
  private DB_SETUP_KEY = 'first_db_setup'    /** Para crear una vriable Alamcenamiento local:  habria que borrarla cuando se hagan cambios en la bd  */
  private DB_NAME_KEY = 'db_name'           /** Para crear una vriable Alamcenamiento local  */
  private dbName: string;
  public dbReady: BehaviorSubject<boolean>;

  public users: Users[]
  
  constructor(private alertCtrl: AlertController, private http: HttpClient) {
    this.isWeb = false;
    this.dbName = '';
    this.dbReady = new BehaviorSubject(false);      /**  Esta siempre escuchando BehaviorSubject */
  }

  /* Inicializar la base de datos  */
  async init() {
    const info = await Device.getInfo();     /* obtener la información del dispositivo */
    console.log("info", info)
    const sqlite = CapacitorSQLite as any;   /* objeto sqlite */

    if (info.platform == 'android') {         /* si es un Android */
      try {
        await sqlite.requestPermission();     /* solicitar permisos */
      } catch (error) {  /* si hubo error entonces indicar que se requieren permisos  */
        const alert = await this.alertCtrl.create({
          header: 'Atención',
          message: 'Se necesita el acceso a la base de datos de forma obligatoria',
          buttons: ['OK']
        });
        await alert.present();
      }
    } else if (info.platform == 'web') { //web
      this.isWeb = true;
      await sqlite.initWebStore();  /* inicializar sqlite en plataforma web */
    }
    this.setupDataBase();

  }

  async setupDataBase() {
    console.log("entro a setupdatabase")
    const dbSetupDone = await Preferences.get({ key: this.DB_SETUP_KEY })
    console.log("dbSetupDone.value:", dbSetupDone.value);

    if (!dbSetupDone.value) {
      await this.downloadDataBase();
      //await Preferences.set({ key: this.DB_SETUP_KEY, value: 'true' });
      //this.dbReady.next(true);
      console.log("Crear Conexion...")
    } else {
      console.log("ya esta configurada")
      const db = await this.getDbName();
      await CapacitorSQLite.createConnection({ database: db });
      await CapacitorSQLite.open({ database: db })
      this.dbReady.next(true);
    }
  }

  async downloadDataBase() {
    this.http.get('assets/db/db.json').subscribe(async (jsonExport: JsonSQLite) => {
      const jsonstring = JSON.stringify(jsonExport)
      const isValid = await CapacitorSQLite.isJsonValid({ jsonstring });
      if (isValid.result) {
        this.dbName = jsonExport.database;
        await CapacitorSQLite.importFromJson({ jsonstring });   //Se crea la base de datos
        await CapacitorSQLite.createConnection({ database: this.dbName }) // Nos conectamos
        await CapacitorSQLite.open({ database: this.dbName })

        console.log("my bd is", this.dbName)

        await Preferences.set({ key: this.DB_SETUP_KEY, value: '1' })          /** variable Alamcenamiento local first_db_setup lo colaca en 1 */
        await Preferences.set({ key: this.DB_NAME_KEY, value: this.dbName }) /** vriable Alamcenamiento local  db_name */
        this.dbReady.next(true);

      }
    })
  }


  async getDbName() {
    if (!this.dbName) {
      const db = await Preferences.get({ key: this.DB_NAME_KEY });
      this.dbName = db.value;
    }
    return this.dbName;
  }

  async getUsers(): Promise<Users[]> {
    const db = await this.getDbName();
    const sql = `SELECT * FROM users`;
  
    try {
      const response = await CapacitorSQLite.query({
        database: db,
        statement: sql,
        values: []
      });
  
      if (response.values && response.values.length > 0) {
        const users: Users[] = response.values.map(row => ({
          id: row.id,
          identificacion: row.identificacion,
          name: row.name,
          email: row.email,
          celphone: row.celphone,
          password: row.password,
          state: row.state,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          rolId: row.rolId,
        }));
        return users;
      } else {
        console.warn('No se encontraron usuarios en la base de datos.');
        return [];
      }
    } catch (error) {
      console.error('Error al consultar los usuarios desde SQLite:', error);
      throw error;
    }
  }

  async getProgramacion(): Promise<Programacion[]> {
    const sql = `SELECT * FROM programacion`;
    const db = await this.getDbName();
  
    try {
      const response = await CapacitorSQLite.query({
        database: db,
        statement: sql,
        values: []
      });
  
      if (response.values && response.values.length > 0) {
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
          sucursalId: row.sucursalId,
          responsableId: row.responsableId,
          fincaId: row.fincaId,
          actividadId: row.actividadId,
          estadoId: row.estadoId,
          prioridadId: row.prioridadId
        }));
      } else {
        console.warn('No se encontraron programaciones en la base de datos.');
        return [];
      }
    } catch (error) {
      console.error('Error al obtener programaciones desde SQLite:', error);
      throw error;
    }
  }  
}