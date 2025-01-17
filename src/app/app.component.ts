import { Component, HostListener } from '@angular/core';
import { Device } from '@capacitor/device';
import { Platform } from '@ionic/angular';
import { SqliteManagerService } from './services/sqlite-manager.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  public isWeb: boolean;
  public load: boolean = false;

  constructor(private platform: Platform, private sqliteService: SqliteManagerService, private authService: AuthService) {
    this.isWeb = false;
    this.initApp();
  }

  ngOnInit() {
    sessionStorage.setItem('active', 'true'); // Marca la página como activa
  }

  ngOnDestroy() {
    sessionStorage.removeItem('active'); // Limpia el indicador al destruir el componente
  }

  // Detectar cuando se cierra o recarga la pestaña
  @HostListener('window:beforeunload', ['$event'])
  clearTokenOnUnload(event: Event) {

    const isPageActive = sessionStorage.getItem('active')

    if (isPageActive) {
      sessionStorage.removeItem('active')
    } else {
      this.authService.logout(); // Elimina el token al cerrar o recargar la pestaña
    }
  }

  initApp() {
    this.platform.ready().then(async () => {
      const info = await Device.getInfo();
      this.isWeb = info.platform === 'web'

      this.sqliteService.init();
      this.sqliteService.dbReady.subscribe(isReady => {
        this.load = isReady;
      })
    })
  }
}