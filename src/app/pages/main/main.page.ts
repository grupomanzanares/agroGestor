import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
  styleUrls: ['./main.page.scss'],
})
export class MainPage implements OnInit {

  currentPath: string = '';
  selectedButton: string = '';

  constructor(private router: Router) { }

  ngOnInit() {
    this.router.events.subscribe((event: any) => {
      if (event?.url) this.currentPath = event.url
    })
  }

  navigateTo(event: Event): void {
    // Obtén el ID del botón presionado
    const targetId = (event.target as HTMLElement).id;

    try {
      switch (targetId) {
        case 'actividades':
          this.router.navigateByUrl('main/actividades');
          console.log('Navegando a: main/actividades');
          break;

        case 'sincronizar':
          this.router.navigateByUrl('main/sincronizar');
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

}
