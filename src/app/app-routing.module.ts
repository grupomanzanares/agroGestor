import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthRedirectGuard } from './guards/authredirect.guard';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule), canActivate: [AuthRedirectGuard],
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'main',
    loadChildren: () => import('./pages/main/main.module').then( m => m.MainPageModule), canActivate: [AuthGuard],
  },
  {
    path: 'programacion',
    loadChildren: () => import('./pages/main/programacion/programacion.module').then( m => m.ProgramacionPageModule )
  },
  {
    path: 'sincronizar',
    loadChildren: () => import('./pages/main/sincronizar/sincronizar.module').then ( m => m.SincronizarPageModule )
  }

];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
