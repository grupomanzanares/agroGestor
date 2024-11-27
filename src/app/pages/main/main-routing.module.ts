import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MainPage } from './main.page';

const routes: Routes = [
  {
    path: 'main',
    component: MainPage,
    children: [
      {
        path: 'actividades',
        loadChildren: () => import('./actividades/actividades.module').then( m => m.ActividadesPageModule)
      },
      {
        path: '',
        redirectTo: '/main/actividades',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/main/actividades',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainPageRoutingModule {}
