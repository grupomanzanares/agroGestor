import { Component, OnInit } from '@angular/core';
import { Network } from '@capacitor/network';
import { ActividadService } from 'src/app/services/actividad.service';
import { CategoriaService } from 'src/app/services/categoria.service';
import { EstadoService } from 'src/app/services/estado.service';
import { FincaService } from 'src/app/services/finca.service';
import { FincaslotesService } from 'src/app/services/fincaslotes.service';
import { IdentificacionService } from 'src/app/services/identificacion.service';
import { LoadingService } from 'src/app/services/loading.service';
import { PrioridadService } from 'src/app/services/prioridad.service';
import { ProgramacionService } from 'src/app/services/programacion.service';
import { PromatrabajadorService } from 'src/app/services/promatrabajador.service';
import { SubcategoriaService } from 'src/app/services/subcategoria.service';
import { SucursalService } from 'src/app/services/sucursal.service';
import { ToastService } from 'src/app/services/toast.service';
import { TrabajadorService } from 'src/app/services/trabajador.service';
import { UnidadService } from 'src/app/services/unidad.service';
import { UploadDataService } from 'src/app/services/upload-data.service';
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
  actividades: { id: number, nombre: string }[] = []
  programaciones: { id: number, fecha: string }[] = []
  prioridades: { id: number, nombre: string }[] = []
  estados: { id: number, nombre: string }[] = []
  lotes: { lote: string, nombre: string, finca: number, ccosto: string }[] = [];
  trabajadores: { id: number, nombre: string }[] = []
  identificaciones: { id: number, nombre: string }[] = []
  proma_trabajador: { programacionId: number, trabajadorId: number }[] = []

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
    private estadoService: EstadoService,
    private loteService: FincaslotesService,
    private trabajadorService: TrabajadorService,
    private identificacionService: IdentificacionService,
    private uploadDataService: UploadDataService,
    private proma_trabajadorService: PromatrabajadorService,
    private loadingService: LoadingService
  ) { }

  ngOnInit() {
    // console.log(this.programaciones)
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
      const lote = await this.loteService.obtenerDtLocal('fincalotes');
      const identificacion = await this.identificacionService.obtenerDtLocal('tp_identificacion');
      const trabajador = await this.trabajadorService.obtenerLocal('trabajador')
      const proma_tra = await this.proma_trabajadorService.obtenerLocal('programacion_trabajadores')
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
      this.lotes = (lote)
      this.identificaciones = (identificacion)
      this.trabajadores = (trabajador)
      this.proma_trabajador = (proma_tra)
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

        // Sincronizar datos usando el token ya existente
        await this.fincaService.sicronizarFinca('finca', 'finca');
        await this.usersService.sincronizarUsers('users', 'users');
        await this.sucursalService.sincronizar('sucursal', 'sucursal');
        await this.unidadService.sincronizar('unidad', 'unidad')
        await this.categoriaService.sincronizar('act-categoria', 'actcategoria')
        await this.subcategoriaService.sincronizar('act-subcategoria', 'actsubcategoria')
        await this.actividadesService.sincronizar('actividad', 'actividad')
        await this.programacionService.sincronizar('programacion', 'programacion')
        await this.prioridadService.sincronizar('prioridad', 'prioridad')
        await this.estadoService.sincronizar('estado', 'estado')
        await this.loteService.sincronizarLote('fincalote', 'fincalotes');
        await this.identificacionService.sincronizar('tiposidentificacion', 'tp_identificacion'),
          await this.trabajadorService.sincronizar('trabajador', "trabajador")
        // await this.proma_trabajadorService.descargarDatosVps('programacion_trabajadores', 'programacion_trabajadores')

        await this.cargar();
        this.toasService.presentToast('Sincronización completada exitosamente', 'success', 'top')
        console.log('Sincronización completada exitosamente.');
      } else {
        this.toasService.presentToast('Debes tener conexión a internet para hacer esto', 'danger', 'top')
      }

      // Verificar si el token ya está disponible
    } catch (error) {
      console.error('Error en la sincronización:', error);
    }
  }

  async subirDatos() {
    const conexion = Network.getStatus();
    try {
      if ((await conexion).connected) {

        console.log("Iniciando subida de datos...");

        // Llamar a la función de sincronización del `UploadDataService`
        const sincronizacionExitosa = await this.uploadDataService.sincronizacion('programacion', 'programacion');
        await this.proma_trabajadorService.sincronizar('programacion_trabajadores', 'programacion_trabajadores')

        if (sincronizacionExitosa) {
          this.toasService.presentToast('Datos subidos correctamente', 'success', 'top');
          console.log('Datos subidos', sincronizacionExitosa)
        } else {
          this.toasService.presentToast('No hubo cambios para subir', 'warning', 'top');
        }

      } else {
        this.toasService.presentToast('Debes tener conexión a internet para hacer esto', 'danger', 'top');
      }
    } catch (error) {
      console.error('Error al subir datos:', error);
      this.toasService.presentToast('Error al subir datos', 'danger', 'top');
    }
  }
  
  async sincronizar() {
    this.loadingService.showLoading();
    await this.subirDatos();
    await this.traerDatos();
    this.loadingService.hideLoading();
  }
}
