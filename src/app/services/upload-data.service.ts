import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { ToastService } from './toast.service';
import { Programacion } from '../models/programacion';
import { ProgramacionService } from './programacion.service';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UploadDataService {

  apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private programacion: ProgramacionService
  ) { }

  obtenerVpsDatos(endPoint: string) {
    return this.http.get<Programacion[]>(`${this.apiUrl}${endPoint}`);
  }

  async comparacion(endPoint: string, tabla: string) {
    try {
      const vpsDatos = await lastValueFrom(this.obtenerVpsDatos(endPoint));
      console.log(vpsDatos)
      const localDatos = await this.programacion.obtenerLocal(tabla);

      if (!localDatos.length) {
        console.log('No hay datos locales disponibles para sincronizar con el VPS.');
        return { update: [], create: [] };
      }

      // Filtrar los datos locales que NO están en el VPS (Datos Nuevos)
      const datosParaCrear = localDatos.filter(localDato => {
        return !vpsDatos.some(vpsItem => String(vpsItem.id) === String(localDato.id));
      });

      // Filtrar los datos que YA existen en el VPS pero han cambiado (Datos para Update)
      const datosParaActualizar = localDatos.filter(localDato => {
        const vpsItem = vpsDatos.find(vps => String(vps.id) === String(localDato.id));
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
      console.log('token', token)
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

      const url = `${this.apiUrl}${endPoint}`

      const response = await lastValueFrom(
        this.http.post(url, datos, { headers })
      );

      console.log("Respuesta del VPS:", response);
      this.toast.presentToast('Datos nuevos sincronizados correctamente', 'success', 'top');
      return true;
    } catch (error) {
      console.error('Error al subir datos al VPS:', error);
      this.toast.presentToast('Error al sincronizar datos', 'danger', 'top');
      return false;
    }
  }

  async actualizarDatos(datos: any, endPoint: string): Promise<boolean> {
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

      console.log("Actualizando datos existentes en el VPS:", datos);

      const response = await lastValueFrom(
        this.http.put(`${this.apiUrl}${endPoint}`, datos, { headers }) // Cambia a `PUT` para actualizar registros
      );

      console.log("Respuesta del VPS:", response);
      this.toast.presentToast('Datos actualizados correctamente en el VPS', 'success', 'top');
      return true;
    } catch (error) {
      console.error('Error al actualizar datos en el VPS:', error);
      this.toast.presentToast('Error al actualizar datos en el VPS', 'danger', 'top');
      return false;
    }
  }
}
