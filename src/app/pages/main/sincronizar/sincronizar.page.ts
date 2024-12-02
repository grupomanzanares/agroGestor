import { Component, OnInit } from '@angular/core';
import { FincaService } from 'src/app/services/finca.service';
import { UsersService } from 'src/app/services/users.service';

@Component({
  selector: 'app-sincronizar',
  templateUrl: './sincronizar.page.html',
  styleUrls: ['./sincronizar.page.scss'],
})
export class SincronizarPage implements OnInit {

  fincas: { id: number, nombre: string }[] = [];
  users: { id: number, name: string }[] = [];


  constructor(private fincaService: FincaService, private usersService: UsersService) { }

  ngOnInit() {
  }

  async cargar() {
    try {
      const finca = await this.fincaService.obtenerDtLocal('finca')
      const user = await this.usersService.obtenerDtLocal('users')
      this.users = (user)

      this.fincas = (finca)
    } catch (error) {
      console.error('Error al cargar los datos locales:', error)
    }
  }

  async traerDatos() {
    try {
      await this.fincaService.sicronizarFinca('finca', 'finca')
      await this.usersService.sincronizarUsers('users', 'users')
      await this.cargar()
      console.log('Sincronizacion completada exitosamente');
    } catch (error) {
      console.error('Error en la sincronizacion:', error)
    }
  }
}
