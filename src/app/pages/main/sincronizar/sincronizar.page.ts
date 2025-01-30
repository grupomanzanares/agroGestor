import { Component, OnInit } from '@angular/core';
import { Network } from '@capacitor/network';
import { ActividadService } from 'src/app/services/actividad.service';
import { CategoriaService } from 'src/app/services/categoria.service';
import { EstadoService } from 'src/app/services/estado.service';
import { FincaService } from 'src/app/services/finca.service';
import { PrioridadService } from 'src/app/services/prioridad.service';
import { ProgramacionService } from 'src/app/services/programacion.service';
import { SubcategoriaService } from 'src/app/services/subcategoria.service';
import { SucursalService } from 'src/app/services/sucursal.service';
import { ToastService } from 'src/app/services/toast.service';
import { UnidadService } from 'src/app/services/unidad.service';
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
  unidades: { id: number, nombre: string }[] = [];
  categorias: { id: number, nombre: string }[] = [];
  subcategorias: { id: number, nombre: string }[] = [];
  actividades: {id: number, nombre: string} [] = []
  programaciones: {id: number, fecha: string} [] = []
  prioridades: {id: number, nombre: string} [] = []
  estados: {id: number, nombre: string} [] = []


  constructor(
    private fincaService: FincaService,
    private usersService: UsersService,
    private sucursalService: SucursalService,
    private unidadService: UnidadService,
    private categoriaService: CategoriaService,
    private subcategoriaService: SubcategoriaService,
    private actividadesService: ActividadService,
    private toasService: ToastService,
    private programacionService: ProgramacionService,
    private prioridadService: PrioridadService,
    private estadoService: EstadoService
  ) { }

  ngOnInit() {
    console.log(this.programaciones)
  }

  async cargar() {
    try {
      const finca = await this.fincaService.obtenerDtLocal('finca')
      const user = await this.usersService.obtenerDtLocal('users')
      const sucursal = await this.sucursalService.obtenerLocal('sucursal')
      const unidad = await this.unidadService.obtenerLocal('unidad')
      const categoria = await this.categoriaService.obtenerLocal('actcategoria')
      const subcategoria = await this.subcategoriaService.obtenerLocal('actsubcategoria')
      const actividad = await this.actividadesService.obtenerLocal('actividad')
      const programacion = await this.programacionService.obtenerLocal('programacion')
      const prioridad = await this.prioridadService.obtenerLocal('prioridad')
      const estado = await this.estadoService.obtenerLocal('estado')
      this.users = (user)
      this.fincas = (finca)
      this.sucursales = (sucursal)
      this.unidades = (unidad)
      this.categorias = (categoria)
      this.subcategorias = (subcategoria)
      this.actividades = (actividad)
      this.programaciones = (programacion)
      this.prioridades = (prioridad)
      this.estados = (estado)
    } catch (error) {
      console.error('Error al cargar los datos locales:', error)
    }
  }

  async traerDatos() {
    const conexion = Network.getStatus()
    try {

      if ((await conexion).connected) {
        const token = localStorage.getItem('token')
  
        if (!token) {
          console.error('No se encontró un token. Asegúrate de que el usuario haya iniciado sesión.');
          this.toasService.presentToast('Asegúrate de haber iniciado sesión', 'danger', 'top')
          return;
        }
  
        if (!this.usersService.token) {
          console.log('Generando token')
          const token = localStorage.getItem('token')
          console.log('Token generado')
        }
  
        // Sincronizar datos usando el token ya existente
        await this.fincaService.sicronizarFinca('finca', 'finca');
        await this.usersService.sincronizarUsers('users', 'users');
        await this.sucursalService.sincronizar('sucursal', 'sucursal');
        await this.unidadService.sincronizar('unidad', 'unidad')
        await this.categoriaService.sincronizar('act-categoria', 'actcategoria')
        await this.subcategoriaService.sincronizar('act-subcategoria', 'actsubcategoria' )
        await this.actividadesService.sincronizar('actividad', 'actividad')
        await this.programacionService.sincronizar('programacion', 'programacion')
        await this.prioridadService.sincronizar('prioridad', 'prioridad')
        await this.estadoService.sincronizar('estado', 'estado')
        await this.cargar();
        console.log('Sincronización completada exitosamente.');
      } else {
        this.toasService.presentToast('Debes tener conexión a internet para hacer esto', 'danger', 'top')
      }

      // Verificar si el token ya está disponible
    } catch (error) {
      console.error('Error en la sincronización:', error);
    }
  }
}
