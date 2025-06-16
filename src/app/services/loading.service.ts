import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {

  private loadingInstance: HTMLIonLoadingElement | null = null

  constructor(private loadingCtrl: LoadingController) { }

  async showLoading(message: string = 'Cargando ...'): Promise<void>{
    this.loadingInstance = await this.loadingCtrl.create({
      spinner: 'crescent',
      message,
    });
    await this.loadingInstance.present()
  }

  async hideLoading(): Promise<void> {
    if (this.loadingInstance) {
      await this.loadingInstance.dismiss();
      this.loadingInstance = null;
    }
  }
}
