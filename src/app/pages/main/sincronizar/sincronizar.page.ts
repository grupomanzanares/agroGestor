import { Component, OnInit } from '@angular/core';
import { FincaService } from 'src/app/services/finca.service';
import { SucursalService } from 'src/app/services/sucursal.service';
import { UsersService } from 'src/app/services/users.service';

@Component({
  selector: 'app-sincronizar',
  templateUrl: './sincronizar.page.html',
  styleUrls: ['./sincronizar.page.scss'],
})
export class SincronizarPage implements OnInit {

  fincas: { id: number, nombre: string }[] = [];
  users: { id: number, name: string }[] = [];
  sucursales: { id: number, nombre: string }[] = [];


  constructor(private fincaService: FincaService, private usersService: UsersService, private sucursalService: SucursalService) { }

  ngOnInit() {
  }

  async cargar() {
    try {
      const finca = await this.fincaService.obtenerDtLocal('finca')
      const user = await this.usersService.obtenerDtLocal('users')
      const sucursal = await this.sucursalService.obtenerLocal('sucursal')
      this.users = (user)
      this.fincas = (finca)
      this.sucursales = (sucursal)
    } catch (error) {
      console.error('Error al cargar los datos locales:', error)
    }
  }

  async traerDatos() {
    try {
      // Verificar si el token ya está disponible
      const token = this.usersService.getCredentials();

      if (!token) {
        console.error('No se encontró un token. Asegúrate de que el usuario haya iniciado sesión.');
        return;
      }

      if (!this.usersService.token) {
        console.log('Generando token')
        await this.usersService.geneToken(token.identificacion, token.password)
        console.log('Token generado')
      }
 
      // Sincronizar datos usando el token ya existente
      await this.fincaService.sicronizarFinca('finca', 'finca');
      await this.usersService.sincronizarUsers('users', 'users');
      await this.sucursalService.sincronizar('sucursal', 'sucursal');
      await this.cargar();
      console.log('Sincronización completada exitosamente.');
    } catch (error) {
      console.error('Error en la sincronización:', error);
    }
  }
}
