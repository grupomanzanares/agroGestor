import { Component } from '@angular/core';
import { Device } from '@capacitor/device';
import { Platform } from '@ionic/angular';
import { SqliteManagerService } from './services/sqlite-manager.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  public isWeb: boolean;
  public load: boolean = false;

  constructor(private platform: Platform, private sqliteService: SqliteManagerService) {
    this.isWeb = false;
    this.initApp();
  }
  initApp(){
    this.platform.ready().then( async ()=> {
      const info =  await Device.getInfo();
      this.isWeb = info.platform === 'web' 
      
      this.sqliteService.init();
      this.sqliteService.dbReady.subscribe(isReady =>{
        this.load = isReady;
      })
    })
  }
}