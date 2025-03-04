import { Injectable } from '@angular/core';
import { ModalController, ModalOptions } from '@ionic/angular';

@Injectable({
    providedIn: 'root'
})
export class ModalService {

    constructor(private modalCtrl: ModalController) { }

    async openModal(options: ModalOptions) {
        const modal = await this.modalCtrl.create(options);
        await modal.present();

        const { data } = await modal.onWillDismiss();

        if (data) return data
    }

    dismissModal(data?: any) {
        return this.modalCtrl.dismiss(data)
    }
}