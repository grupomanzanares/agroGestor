import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SincronizarPage } from './sincronizar.page';

const routes: Routes = [
  {
    path: '',
    component: SincronizarPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SincronizarPageRoutingModule {}
