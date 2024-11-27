import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ActividadesPageRoutingModule } from './actividades-routing.module';

import { ActividadesPage } from './actividades.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ActividadesPageRoutingModule,
    SharedModule
  ],
  declarations: [ActividadesPage]
})
export class ActividadesPageModule {}
