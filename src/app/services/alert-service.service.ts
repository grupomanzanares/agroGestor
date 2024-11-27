import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor(private alertCtrl: AlertController) { }

  async alertMenssage(header: string, message: string){
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons:['OK']
    })
    await alert.present();
  }


  async alertConfirm(header: string, message: string, functionOk: Function){
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons:[

        {
          text: 'Cancelar',
          role:'cancel',
          handler:()=>{}
        },
        {
          text:'Ok',
          role: 'confirm',
          handler: () => {
            functionOk();
          }
        }
      ]
    })
    await alert.present();
  }
}
