import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Users } from 'src/app/models/users';
import { AlertService } from 'src/app/services/alert-service.service';
import { SqliteManagerService } from 'src/app/services/sqlite-manager.service';
import { UsersService } from 'src/app/services/users.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  users: Users[] = []; // Usamos directamente `Users[]` para consistencia
  public loginFrom = new FormGroup({
    nit: new FormControl(null, [Validators.required, Validators.minLength(1), Validators.maxLength(10), Validators.pattern('^[0-9]*$')]),
    password: new FormControl(null, [Validators.required])
  });

  constructor(private router: Router, private usersService: UsersService, private sqliteService: SqliteManagerService, private alertService: AlertService) {}

  ngOnInit() {}

  ionViewWillEnter() {
    setTimeout(async () => {
      // await this.traerDatos(); 
      await this.getUsers(); 
    }, 1000);
  }

  async cargar() {
    try {
      const usuarios = await this.usersService.obtenerDtLocal('users');
      this.users = usuarios; // Carga usuarios desde base de datos local
    } catch (error) {
      console.error('Error al cargar los datos locales:', error);
    }
  }

  async traerDatos() {
    try {
      await this.usersService.sincronizarUsers('users', 'users');
      await this.cargar();
      console.log('Sincronización completada exitosamente.');
    } catch (error) {
      console.error('Error en la sincronización:', error);
    }
  }

  async getUsers() {
    try {
      const usuarios = await this.sqliteService.getUsers(); // Llama al servicio para obtener usuarios
      this.users = usuarios; // Asigna los usuarios al array
      console.log('Usuarios cargados:', this.users);
    } catch (error) {
      console.error('Error al obtener los usuarios:', error);
    }
  }

  async login() {
    const { nit, password } = this.loginFrom.value;
  
    if (this.users.length === 0) {
      alert('No hay usuarios disponibles. Por favor, sincronice los datos.');
      return;
    }
  
    // Buscar usuario en la base de datos local
    const usuarioEncontrado = this.users.find(user => user.identificacion === Number(nit) && user.password === password);
  
    if (usuarioEncontrado) {
      try {
        // Almacenar las credenciales en UsersService para generar el token más tarde
        this.usersService.setCredentials({ identificacion: nit, password });
  
        // Redirigir al usuario o realizar otras acciones necesarias
        console.log('Credenciales almacenadas para sincronización.');
        this.router.navigateByUrl('main/actividades');
      } catch (error) {
        console.error('Error durante el proceso de login:', error);
      }
    } else {
      // Si las credenciales no coinciden, mostrar un mensaje de error
      this.alertService.alertMenssage('Error', 'Credenciales incorrectas. Inténtalo de nuevo.');
    }
  }
  
}
