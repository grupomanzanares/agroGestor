import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UsersService } from './users.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private userService: UsersService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.userService.token

    if(token){
      const authReq = req.clone({
        setHeaders:{
          Authorization: `Bearer ${token}`
        },
      });
      return next.handle(authReq)
    }
    return next.handle(req)
  }
}


