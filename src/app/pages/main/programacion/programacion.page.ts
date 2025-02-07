import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { Estado } from 'src/app/models/estado';
import { Prioridad } from 'src/app/models/prioridad';
import { Programacion } from 'src/app/models/programacion';
import { EstadoService } from 'src/app/services/estado.service';
import { FincaslotesService } from 'src/app/services/fincaslotes.service';
import { PrioridadService } from 'src/app/services/prioridad.service';
import { ProgramacionService } from 'src/app/services/programacion.service';
import { SqliteManagerService } from 'src/app/services/sqlite-manager.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-programacion',
  templateUrl: './programacion.page.html',
  styleUrls: ['./programacion.page.scss'],
})
export class ProgramacionPage implements OnInit {

  public showFilters: boolean = false;
  public seguimiento: boolean = false;
  public update: boolean;


  programaciones: Programacion[] = [];
  filteredProgramaciones: Programacion[] = [];
  prioridades: Prioridad[] = [];
  estados: Estado[] = [];
  filterPriori: string = null;
  selectedProgramacion: any = null;
  lotes: any[] = []
  lotesDisponibles: any[] = [];

  public inputs = new FormGroup<{ [key: string]: AbstractControl<any, any> }>({
    actividad: new FormControl({ value: '', disabled: true }),
    estado: new FormControl({ value: '', disabled: true }),
    finca: new FormControl({ value: '', disabled: true }),
    cantidad: new FormControl(0, [Validators.required]),
    jornal: new FormControl(0, [Validators.required]),
    observaciones: new FormControl('', [Validators.required])
  })

  constructor(
    private programacionService: ProgramacionService,
    private prioridadService: PrioridadService,
    private estadoService: EstadoService,
    private toastService: ToastService,
    private lotesService: FincaslotesService
  ) {
    this.seguimiento = false
  }

  ngOnInit() {
    this.getprogramacion();
    this.getPrioridad();
    this.getEstado()
    this.getLotes()
  }

  async onShowForm(programacion: Programacion) {
    console.log('Programación seleccionada:', programacion);

    if (programacion.sincronizado === 1) {
      this.toastService.presentToast('No puedes abrir la programacion si ya fue sincronizada', 'danger', top)
      console.log('no')
      return
    }

    const estado = this.estados.find(e => e.nombre === programacion.estadoNombre);
    const estadoId = estado ? estado.id : null;

    this.selectedProgramacion = {
      ...programacion,
      estadoId
    };

    this.seguimiento = true; // Mostrar el formulario

    // Inicializar los valores del formulario
    this.inputs.patchValue({
      actividad: programacion.actividadNombre,
      estado: programacion.estadoNombre,
      finca: programacion.fincaNombre,
      observaciones: programacion.observacion,
    });

    if (Number(this.selectedProgramacion.controlPorLote) === 1) {
      this.inputs.addControl('lote', new FormControl('', Validators.required));
    } else {
      this.inputs.removeControl('lote');
    }
  }

  onCloseForm() {
    this.seguimiento = false; // Ocultar el formulario
    this.selectedProgramacion = null
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  async getprogramacion() {
    try {
      this.programaciones = await this.programacionService.getProgramacionConNombres('programacion');
      this.filteredProgramaciones = [...this.programaciones];
    } catch (error) {
      console.error('Error al obtener programaciones:', error);
    }
  }

  async getEstado() {
    try {
      this.estados = await this.estadoService.obtenerLocal('estado');
      console.log('Estados cargados:', this.estados);
    } catch (error) {
      console.error('Error al cargar los estados:', error);
    }
  }

  async getPrioridad() {
    try {
      this.prioridades = await this.prioridadService.obtenerLocal('prioridad');
    } catch (error) {
      console.error('Error al cargar prioridades:', error);
    }
  }

  async getLotes() {
    try {
      this.lotes = await this.lotesService.obtenerDtLocal('fincalotes') || []
      console.log('Lotes cargados:', this.lotes)
    } catch (error) {
      console.error('Error al cargar los lotes')
      this.lotes = []
    }
  }

  filter() {
    if (this.filterPriori) {
      this.filteredProgramaciones = this.programaciones.filter((p) => p.prioridadNombre === this.filterPriori);
    } else {
      this.toastService.presentToast('No has seleccionado alguna prioridad', 'danger', 'top')
    }
  }

  resetFilters() {
    this.filterPriori = null;
    this.filteredProgramaciones = null;
  }

  getPendientes(): Programacion[] {
    return this.programaciones.filter(p => p.estadoNombre === 'Pendiente');
  }

  getEnProceso(): Programacion[] {
    return this.programaciones.filter(p => p.estadoNombre === 'En Proceso');
  }

  getRealizados(): Programacion[] {
    return this.programaciones.filter(p => p.estadoNombre === 'Realizado');
  }

  nullestados(programacion: Programacion): Estado[] {
    if (!programacion || !programacion.estadoId) {
      return []; // Retorna un arreglo vacío si no hay programación seleccionada
    }

    // Filtra los estados que tienen un ID mayor o igual al estado actual
    return this.estados.filter(e => e.id >= programacion.estadoId);
  }

  //Funciion para guardar el proceso y los comentarios  en que va la programacion
  saveChange(programacion: any) {
    if (this.inputs.invalid) {
      this.inputs.markAllAsTouched();
      this.toastService.presentToast('Por favor completa los campos obligatorios', 'danger', 'top');
      return;
    }

    const nuevoEstadoId = this.inputs.get('estado')?.value;
    if (nuevoEstadoId < programacion.estadoId) {
      this.toastService.presentToast('No puedes seleccionar un estado anterior', 'danger', 'top');
      return;
    }

    const data = {
      ...programacion,
      estadoId: nuevoEstadoId,
      observacion: this.inputs.get('observaciones')?.value,
      updatedAt: new Date().toISOString()
    };

    this.programacionService.updateEst([data], 'programacion')
      .then(() => {
        this.toastService.presentToast('Cambios guardados correctamente', 'success', 'top');
        this.selectedProgramacion.estadoId = data.estadoId;
        this.selectedProgramacion.observacion = data.observacion;
        this.onCloseForm();
      })
      .then(() => {
        return this.getprogramacion();
      })
      .catch((error) => {
        console.error('Error al guardar los datos', error);
        this.toastService.presentToast('Error al guardar los cambios', 'danger', 'top');
      });
  }

  async createFromExistingProgramacion(baseProgramacionId: number) {
    // Buscar la programación original
    const baseProgramacion = this.programaciones.find(prog => prog.id === baseProgramacionId);

    if (!baseProgramacion) {
      this.toastService.presentToast('No se encontró la programación base', 'danger', 'top');
      return;
    }

    if (this.inputs.invalid) {
      this.inputs.markAllAsTouched();
      this.toastService.presentToast('Por favor completa los campos obligatorios', 'danger', 'top');
      return;
    }

    // Calcular el nuevo ID basado en el ID original
    const registrosRelacionados = this.programaciones.filter(prog => Math.floor(prog.id / 1000) === baseProgramacionId);
    const ultimoRegistro = registrosRelacionados.length > 0 ? Math.max(...registrosRelacionados.map(prog => prog.id)) : baseProgramacionId * 1000;
    const nuevoId = ultimoRegistro + 1; // Generar nuevo ID consecutivo

    // Calcular la suma de las cantidades de programaciones relacionadas
    const sumaCantidadesRelacionadas = registrosRelacionados.reduce(
      (suma, prog) => suma + prog.cantidad, 0);

    // Verificar si la suma de cantidades alcanza o supera la cantidad de la programación original
    const cantidadTotal = sumaCantidadesRelacionadas + (this.inputs.get('cantidad')?.value || 0); // Incluir la cantidad de la nueva programación
    const nuevoEstadoId = cantidadTotal >= baseProgramacion.cantidad ? 3 : 2; // Estado: 3 = Terminado, 2 = En Proceso

    // Crear la nueva programación tomando como base la original
    const nuevaProgramacion: Programacion = {
      id: nuevoId,
      programacion: baseProgramacion.id,
      fecha: this.inputs.get('fecha')?.value || new Date().toISOString(), // Tomar del formulario o fecha actual
      lote: this.inputs.get('lote')?.value || "",
      jornal: this.inputs.get('jornal')?.value || baseProgramacion.jornal,
      cantidad: this.inputs.get('cantidad')?.value || baseProgramacion.cantidad,
      habilitado: 1, // Activado por defecto
      sincronizado: 0, 
      fecSincronizacion: new Date().toISOString(), // Fecha de sincronización vacía
      observacion: this.inputs.get('observaciones')?.value || baseProgramacion.observacion,
      signo: -1,
      maquina: '',
      usuario: localStorage.getItem('userName'), // Cambiar según lógica de autenticación
      usuarioMod: localStorage.getItem('userName'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sucursalId: baseProgramacion.sucursalId,
      fincaId: baseProgramacion.fincaId,
      actividadId: baseProgramacion.actividadId,
      estadoId: nuevoEstadoId, // Usar el estado calculado
      prioridadId: baseProgramacion.prioridadId
    };

    try {
      // Actualizar la programación original si corresponde
      if (nuevoEstadoId === 3) {
        const updateOriginal = {
          ...baseProgramacion,
          estadoId: 3, // Terminado
          updatedAt: new Date().toISOString(),
          usuarioMod: localStorage.getItem('userName')
        };
        await this.programacionService.updateEst([updateOriginal], 'programacion');
      }

      // Insertar la nueva programación en la base de datos
      await this.programacionService.create([nuevaProgramacion], 'programacion');
      this.toastService.presentToast('Registro realizado', 'success', 'top');
      this.getprogramacion(); // Actualizar la lista de programaciones
      this.inputs.reset();
      this.onCloseForm(); // Cerrar el formulario
    } catch (error) {
      console.error('Error al crear nueva programación:', error);
      this.toastService.presentToast('Error al crear nueva programación', 'danger', 'top');
    }
  }

}
