import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Network } from '@capacitor/network';
import { Users } from 'src/app/models/users';
import { AlertService } from 'src/app/services/alert-service.service';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SqliteManagerService } from 'src/app/services/sqlite-manager.service';
import { ToastService } from 'src/app/services/toast.service';
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

  conectado: boolean = false

  constructor(private router: Router, private usersService: UsersService, private sqliteService: SqliteManagerService, private alertService: AlertService, private toastService: ToastService, private loadinService: LoadingService, private auth: AuthService) { }

  ngOnInit() {
    this.escuchandocambios()
  }

  ionViewWillEnter() {
    setTimeout(async () => {
      // await this.traerDatos(); 
      await this.getUsers();
      if (this.users.length === 0) {
        console.warn('No se encontraron usuarios después de cargar la base de datos.');
      }
    }, 1000);
  }

  async login() {
    // Verifica el estado de la conexión
    const estado = await Network.getStatus();
    console.log('Estado de la conexión:', estado);

    // Valida el formulario antes de continuar
    if (this.loginFrom.invalid) {
      this.toastService.presentToast('Por favor completar todos los campos correctamente', 'danger', 'top');
      return;
    }

    // Obtén los valores del formulario
    const { nit, password } = this.loginFrom.value;

    try {
      if (estado.connected) {
        // Lógica en línea
        await this.online(nit, password);
      } else {
        // Lógica sin conexión
        await this.offline(nit, password);
      }
    } catch (error) {
      console.error('Error en el proceso de login:', error);
      this.toastService.presentToast('Ocurrió un error inesperado. Por favor intenta nuevamente.', 'danger', 'top'
      );
    }
  }

  private async online(nit: number, password: string) {
    this.auth.login(nit, password).subscribe({
      next: async (response) => {
        if (response.token) {
          const userName = response.user?.name || 'Usuario';
          this.toastService.presentToast(`Bienvenid@ ${userName}`, 'success', 'top');
          await this.loadinService.hideLoading();
          this.auth.saveToken(response.token, userName);
          this.router.navigate(['main']);
          this.loginFrom.reset()
        } else {
          this.toastService.presentToast('Error inesperado. Intenta nuevamente.', 'danger', 'top');
          console.error('Token faltante en la respuesta:', response);
        }
      },
      error: (error) => {
        console.error('Error de autenticación:', error);
        this.toastService.presentToast('Credenciales incorrectas. Por favor intenta nuevamente.', 'danger', 'top');
      },
    });
  }

  private async offline(nit: number, password: string) {
    console.log('Sin internet, verificando credenciales locales...');

    if (!this.users || this.users.length === 0) {
      console.warn('No hay usuarios cargados. Verifica la sincronización.');
      this.alertService.alertMenssage('Error', 'No hay usuarios disponibles. Por favor, sincronice los datos.');
      return;
    }

    this.users.forEach((user) => {
      console.log(
        `Usuario: identificacion=${user.identificacion}, password=${user.password}`
      );
    });

    // Busca el usuario en los datos locales
    const usuarioEncontrado = this.users.find(
      (user) =>
        user.identificacion.toString() === nit.toString() &&
        user.password === password
    );

    if (usuarioEncontrado) {
      console.log('Usuario encontrado:', usuarioEncontrado);
      this.usersService.setCredentials({
        identificacion: Number(nit),
        password,
      });
      this.loginFrom.reset();
      this.router.navigateByUrl('main');
    } else {
      console.warn(
        'No se encontró un usuario con las credenciales proporcionadas.'
      );
      this.alertService.alertMenssage(
        'Error',
        'Credenciales incorrectas. Inténtalo de nuevo.'
      );
    }
  }

  escuchandocambios() {
    Network.addListener('networkStatusChange', (status) => {
      this.conectado = status.connected;
      console.log('Cambio en el estado de la red:', status.connected ? 'Conectado' : 'Desconectado');
    });
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
      this.users = usuarios || []; // Asigna los usuarios al array
      console.log('Usuarios cargados:', this.users);
    } catch (error) {
      console.error('Error al obtener los usuarios:', error);
      this.users = []
    }
  }

}
