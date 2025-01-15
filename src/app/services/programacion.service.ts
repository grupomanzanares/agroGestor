import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { SqliteManagerService } from './sqlite-manager.service';
import { Observable } from 'rxjs';
import { Programacion } from '../models/programacion';

@Injectable({
  providedIn: 'root'
})
export class ProgramacionService {

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient, private sqlService: SqliteManagerService) { }

  obternerVps(endPoint: string): Observable<Programacion>{
    const token = localStorage.getItem('token')
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    })
    return this.http.get<Programacion[]>(`${this.apiUrl}${endPoint}`, { headers })
  }

}
