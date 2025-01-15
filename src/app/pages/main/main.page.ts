import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
  styleUrls: ['./main.page.scss'],
})
export class MainPage implements OnInit {

  currentPath: string = '';

  constructor(private router: Router, private auth: AuthService) { }

  ngOnInit() {
    this.router.events.subscribe((event: any) => {
      if (event?.url) this.currentPath = event.url
    })
  }

  navigateTo(event: Event): void {
    // Obtén el ID del botón presionado
    const targetId = (event.currentTarget as HTMLElement).id;

    try {
      switch (targetId) {
        case 'actividades':
          this.router.navigateByUrl('programacion');
          console.log('Navegando a: main/actividades');
          break;

        case 'sincronizar':
          this.router.navigateByUrl('sincronizar');
          console.log('Navegando a: main/sincronizar');
          break;

        case 'recoleccion':
          this.router.navigateByUrl('main/recoleccion');
          console.log('Navegando a: main/recoleccion');
          break;

        default:
          console.error('ID no reconocido:', targetId);
          break;
      }
    } catch (error) {
      console.error('Error al navegar:', error);
    }
  }

  logout(){
    this.auth.logout()
  }
}
