import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MainPage } from './main.page';

const routes: Routes = [
  {
    path: '',
    component: MainPage,
    children:[
      {
        path: 'actividades',
        loadChildren: ()=> import('./actividades/actividades.module').then(m => m.ActividadesPageModule)
      },
      {
        path: 'sincronizar',
        loadChildren: () => import('./sincronizar/sincronizar.module').then( m => m.SincronizarPageModule)
      }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainPageRoutingModule {}
