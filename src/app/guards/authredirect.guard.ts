import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthRedirectGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isAuthenticated()) {
      // Si el usuario está autenticado, redirige a 'main'
      this.router.navigate(['/main']);
      return false; // No permite acceso a 'auth'
    }
    return true; // Permite acceso si no está autenticado
  }
}
