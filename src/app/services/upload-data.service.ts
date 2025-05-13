import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { ToastService } from './toast.service';
import { Programacion } from '../models/programacion';
import { ProgramacionService } from './programacion.service';
import { lastValueFrom } from 'rxjs';
import { PromatrabajadorService } from './promatrabajador.service';

@Injectable({
  providedIn: 'root'
})
export class UploadDataService {

  apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private programacion: ProgramacionService,
    private promatrabajadorService: PromatrabajadorService
  ) { }

  obtenerVpsDatos(endPoint: string) {
    const token = localStorage.getItem('token')
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    })
    return this.http.get<Programacion[]>(`${this.apiUrl}${endPoint}`, { headers })
  }

  async comparacion(endPoint: string, tabla: string) {
    try {
      const vpsDatos = await lastValueFrom(this.obtenerVpsDatos(endPoint));

      if (!Array.isArray(vpsDatos)) {
        console.error("Error: la api no devolvio un array valido", vpsDatos)
      }

      const localProgramaciones = await this.programacion.obtenerLocal(tabla);
      const trabajadoresLocal = await this.promatrabajadorService.obtenerLocal('programacion_trabajadores');
      
      // Adjuntar trabajadores a cada programación
      const localDatos = localProgramaciones.map(prog => ({
        ...prog
        // trabajadores: trabajadoresLocal.filter(t => t.programacionId === prog.id)
      }));
      

      if (!Array.isArray(localDatos)) {
        console.error("No hay datos locales disponibles para sincronizar con el VPS")
      }

      // Filtrar los datos locales que NO están en el VPS (Datos Nuevos)
      const datosParaCrear = localDatos.filter(localDato => {
        const localId = localDato.id ? String(localDato.id) : null;
        return localId && !vpsDatos.some(vpsItem => vpsItem.id && String(vpsItem.id) === localId);
      });

      // Filtrar los datos que YA existen en el VPS pero han cambiado (Datos para Update)
      const datosParaActualizar = localDatos.filter(localDato => {
        const localId = localDato.id ? String(localDato.id) : null;
        const vpsItem = vpsDatos.find(vps => vps.id && String(vps.id) === localId);

        if (!vpsItem) return false; // Si no existe en VPS, no se actualiza
        return JSON.stringify(vpsItem) !== JSON.stringify(localDato); // Comparación profunda
      });

      console.log("Datos para crear (nuevos):", datosParaCrear);
      console.log("Datos para actualizar (cambios en registros existentes):", datosParaActualizar);
      return { update: datosParaActualizar, create: datosParaCrear };

    } catch (error) {
      console.error('Error al comparar datos:', error);
      return { update: [], create: [] };
    }
  }

  async sincronizacion(endPoint: string, tabla: string): Promise<boolean> {
    try {
      const { create, update } = await this.comparacion(endPoint, tabla);

      let sincronizacionExitosa = false;

      if (create.length > 0) {
        console.log('Datos nuevos para insertar en el VPS:', create);
        sincronizacionExitosa = await this.subirDatos(create, endPoint);
      }

      if (update.length > 0) {
        console.log('Datos que han cambiado, actualizando en el VPS:', update);
        sincronizacionExitosa = await this.actualizarDatos(update, endPoint);
      }

      if (!create.length && !update.length) {
        console.log('No hay cambios que sincronizar.');
      }

      return sincronizacionExitosa;
    } catch (error) {
      console.error('Error en la sincronización de datos:', error);
      return false;
    }
  }

  async subirDatos(datos: any, endPoint: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("No hay token disponible, no se puede autenticar la solicitud.");
        this.toast.presentToast('Error de autenticación', 'danger', 'top');
        return false;
      }

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      console.log("Enviando datos nuevos al VPS:", datos);

      let camId = []
      let traId = []

      for (const dato of datos) {
        const url = `${this.apiUrl}${endPoint}/create`
        console.log('Enviando datos al vps en:', url)

        dato.sincronizado = 1
  
        const response: any = await lastValueFrom(
          this.http.post(url, dato, { headers })
        );
        console.log("Respuesta del VPS:", response);

        if (response && response.id) {
          camId.push({
            idLocal: dato.id,
            nuevoId: response.id
          })
        }    

        if (camId.length > 0) {
          await this.programacion.updateId(camId, 'programacion')
          await this.programacion.updateIdTrabajadores(camId, 'programacion_trabajadores')
        }
      }

      // this.toast.presentToast('Datos nuevos sincronizados correctamente', 'success', 'top')
      return true;
    } catch (error) {
      console.error('Error al subir datos al VPS:', error);
      this.toast.presentToast('Error al sincronizar datos', 'danger', 'top');
      return false;
    }
  }

  async actualizarDatos(datos: any[], endPoint: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("No hay token disponible, no se puede autenticar la solicitud.");
        this.toast.presentToast('Error de autenticación', 'danger', 'top');
        return false;
      }
  
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });
  
      console.log("Datos a actualizar:", datos);
  
      for (const item of datos) {
        if (!item.id) {
          console.error("Error: El objeto a actualizar no tiene un ID válido", item);
          continue; // Saltar este item si no tiene ID
        }
  
        const url = `${this.apiUrl}${endPoint}/${item.id}`; // Se agrega el ID en la URL
        // console.log("Actualizando registro en:", url);
  
        const response = await lastValueFrom(
          this.http.put(url, item, { headers }) // Ahora incluye el ID en la URL
        );
  
        // console.log("Respuesta del VPS:", response);
      }
  
      this.toast.presentToast('Datos actualizados correctamente en el VPS', 'success', 'top');
      return true;
    } catch (error) {
      console.error('Error al actualizar datos en el VPS:', error);
      this.toast.presentToast('Error al actualizar datos en el VPS', 'danger', 'top');
      return false;
    }
  }
}
