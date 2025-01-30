import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { observeNotification } from 'rxjs/internal/Notification';
import { Estado } from 'src/app/models/estado';
import { Prioridad } from 'src/app/models/prioridad';
import { Programacion } from 'src/app/models/programacion';
import { EstadoService } from 'src/app/services/estado.service';
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

  public inputs = new FormGroup({
    actividad: new FormControl({ value: '', disabled: true }),
    estado: new FormControl(),
    finca: new FormControl({ value: '', disabled: true }),
    observaciones: new FormControl('', [Validators.required])
  })

  constructor(
    private programacionService: ProgramacionService,
    private sqliteService: SqliteManagerService,
    private prioridadService: PrioridadService,
    private estadoService: EstadoService,
    private toastService: ToastService
  ) {
    this.seguimiento = false
  }

  ngOnInit() {
    this.getprogramacion();
    this.getPrioridad();
    this.getEstado()
  }

  async onShowForm(programacion: Programacion) {
    console.log('Programación seleccionada:', programacion);

    // Encuentra el ID del estado basado en el nombre
    const estado = this.estados.find(e => e.nombre === programacion.estadoNombre);
    const estadoId = estado ? estado.id : null;

    console.log('Estado ID encontrado:', estadoId);

    this.selectedProgramacion = {
      ...programacion,
      estadoId
    };

    this.seguimiento = true; // Mostrar el formulario

    // Inicializar los valores del formulario
    this.inputs.patchValue({
      actividad: programacion.actividadNombre,
      estado: estadoId,
      finca: programacion.fincaNombre,
      observaciones: programacion.observacion,
    });
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

  //Funciion para guardar el proceso y los comentarios  en que va la programacion
  saveChange(programacion: any) {
    if (this.inputs.invalid) {
      this.inputs.markAllAsTouched();
      this.toastService.presentToast('Por favor completa los campos obligatorios', 'danger', 'top');
      return;
    }
    const data = {
      ...programacion,
      estadoId: this.inputs.get('estado')?.value,
      observacion: this.inputs.get('observaciones')?.value,
      updatedAt: new Date().toISOString()
    }

    this.programacionService.updateEst([data], 'programacion')
      .then(() => {
        this.toastService.presentToast('Cambios guardados correctamente', 'success', 'top')
        this.selectedProgramacion.estadoId = data.estadoId;
        this.selectedProgramacion.observacion = data.observacion;
        this.onCloseForm()
      })
      .then(() => {
        return this.getprogramacion()
      })
      .catch((error) => {
        console.error('Error al guardar los datos', error)
        this.toastService.presentToast('Error al guardar los cambios', 'danger', 'top')
      })
  }
}
