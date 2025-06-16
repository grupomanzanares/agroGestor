import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { Estado } from 'src/app/models/estado';
import { Finca } from 'src/app/models/finca';
import { Prioridad } from 'src/app/models/prioridad';
import { Programacion } from 'src/app/models/programacion';
import { EstadoService } from 'src/app/services/estado.service';
import { FincaService } from 'src/app/services/finca.service';
import { FincaslotesService } from 'src/app/services/fincaslotes.service';
import { PrioridadService } from 'src/app/services/prioridad.service';
import { ProgramacionService } from 'src/app/services/programacion.service';
import { PromatrabajadorService } from 'src/app/services/promatrabajador.service';
import { ToastService } from 'src/app/services/toast.service';
import { TrabajadorService } from 'src/app/services/trabajador.service';

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
  fincas: Finca[] = [];
  estados: Estado[] = [];
  filterPriori: string = null;
  selectedProgramacion: any = null;
  lotes: any[] = []
  trabajadores: any[] = []
  trabajadoresFilter: any[] = []
  lotesfincas: any[]
  seleccionarTodos: boolean = false;
  form: FormGroup;
  seguimientos: Programacion[] = []
  filterSeguimiento: Programacion[] = []
  filterFinca: string = null;
  searchTrabajador: string = ''
  trabajadoresSeleccionados: any[] = [];
  usuarioLogeo = localStorage.getItem('userName')


  public inputs = new FormGroup<{ [key: string]: AbstractControl<any, any> }>({
    actividad: new FormControl({ value: '', disabled: true }),
    estado: new FormControl({ value: '', disabled: true }),
    finca: new FormControl({ value: '', disabled: true }),
    cantidad: new FormControl(0, [Validators.min(0)]),
    jornal: new FormControl(0, [Validators.required]),
    observaciones: new FormControl('', [Validators.required])
  })

  constructor(
    private programacionService: ProgramacionService,
    private prioridadService: PrioridadService,
    private estadoService: EstadoService,
    private toastService: ToastService,
    private lotesService: FincaslotesService,
    private trabajadoresService: TrabajadorService,
    private promaTrabajador: PromatrabajadorService,
    private fincaService: FincaService
  ) {
    this.seguimiento = false
  }

  ngOnInit() {
    this.getprogramacion();
    this.getPrioridad();
    this.getFincas()
    this.getEstado()
    this.getLotes()
    this.getTrabajadores()
    this.form = new FormGroup({
      seleccionarTodos: new FormControl(false)
    });
    this.getProgramacionUsuario(this.usuarioLogeo)
    // this.getNombresTrabajadores()
  }

  async onShowForm(programacion: Programacion) {
    // console.log('Programación seleccionada:', programacion);

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

    console.log(this.selectedProgramacion)

    await this.lotesFincas()
    await this.getSeguimiento(programacion.id)

    this.seguimiento = true; // Mostrar el formulario

    // Inicializar los valores del formulario
    this.inputs.patchValue({
      actividad: programacion.actividadNombre,
      estado: programacion.estadoNombre,
      finca: programacion.fincaNombre,
      observaciones: programacion.observacion,
    });

    if (Number(this.selectedProgramacion.controlPorLote) === 1) {
      this.inputs.addControl('lote', new FormControl({ value: '', disabled: true }));
    } else {
      this.inputs.removeControl('lote');
    }

    if (Number(this.selectedProgramacion.controlPorTrabajador) === 1) {
      // No agregamos el formControl aquí, usamos lista externa
    } else {
      this.inputs.removeControl('trabajador');
    }
  }

  async lotesFincas() {
    if (!this.selectedProgramacion) {
      console.error('No hay programación seleccionada');
      return;
    }

    try {
      this.lotesfincas = await this.lotesService.getLotes(this.selectedProgramacion.fincaId);
      console.log('Lotes cargados:', this.lotesfincas);

      // Limpiar los controles existentes antes de agregar nuevos
      Object.keys(this.form.controls).forEach((key) => {
        if (key.startsWith('lote_')) {
          this.form.removeControl(key);
        }
      });

      // Asegurar que 'lote' se crea correctamente en el formulario
      if (!this.form.get('lote')) {
        this.form.addControl('lote', new FormControl(''));
      }

      // Agregar controles dinámicos para los lotes usando "lote" como identificador
      this.lotesfincas.forEach(lote => {
        this.form.addControl(`lote_${lote.lote}`, new FormControl(false));
      });

    } catch (error) {
      console.error('Error al obtener lotes:', error);
      this.lotesfincas = [];
    }
  }

  toggleTodos() {
    const seleccionarTodos = this.form.get('seleccionarTodos').value;

    let seleccionados = [];

    this.lotesfincas.forEach(lote => {
      const control = this.form.get(`lote_${lote.lote}`);
      if (control) {
        control.setValue(seleccionarTodos, { emitEvent: false });
        if (seleccionarTodos) {
          seleccionados.push(lote.lote);
        }
      }
    });

    // Si "Todos" está seleccionado, mostrar "Todos" en el input, de lo contrario, mostrar los lotes seleccionados
    this.form.get('lote').setValue(seleccionarTodos ? 'Todos' : seleccionados.join(', '));

    console.log("Estado de 'Todos':", seleccionarTodos);
    console.log("Lotes seleccionados:", this.form.get('lote').value);
  }

  onCheckboxChange(lote: string) {
    const isChecked = this.form.get(`lote_${lote}`).value;

    // Obtener la lista actual de lotes seleccionados
    let seleccionados = this.form.get('lote').value ? this.form.get('lote').value.split(', ') : [];

    if (isChecked) {
      // Si se selecciona, agregarlo a la lista si no está ya presente
      if (!seleccionados.includes(lote)) {
        seleccionados.push(lote);
      }
    } else {
      // Si se deselecciona, eliminarlo de la lista
      seleccionados = seleccionados.filter(l => l !== lote);
    }

    // Actualizar el input con la lista de lotes seleccionados
    this.form.get('lote').setValue(seleccionados.join(', '));

    console.log("Lotes seleccionados:", this.form.get('lote').value);
  }

  validarLotesSeleccionados(): boolean {
    return Object.keys(this.form.controls)
      .filter(key => key.startsWith('lote_') && this.form.get(key)?.value)
      .length > 0;
  }

  validarTrabajadoresSeleccionados(): boolean {
    return this.trabajadoresSeleccionados.length > 0;
  }

  onCloseForm() {
    this.seguimiento = false; // Ocultar el formulario
    this.selectedProgramacion = null
    this.trabajadoresSeleccionados = []
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  async getprogramacion() {
    try {
      this.programaciones = await this.programacionService.getProgramaciones('programacion', this.usuarioLogeo, null, 1);
      this.filteredProgramaciones = [...this.programaciones];
      console.log(this.filteredProgramaciones)
    } catch (error) {
      console.error('Error al obtener programaciones:', error);
    }
  }



  async getSeguimiento(id: number) {
    try {
      if (!this.selectedProgramacion) {
        console.warn("No hay programación seleccionada.");
        return;
      }

      this.seguimientos = await this.programacionService.getProgramaciones('programacion', null, id, -1);
      this.filterSeguimiento = [...this.seguimientos];

      console.log("Programaciones en seguimiento:", this.seguimientos);
      console.log('Filtraciones', this.filteredProgramaciones)
      console.log('Filtraciones', this.filterSeguimiento)
    } catch (error) {
      console.error('Error al obtener programaciones en seguimiento:', error);
    }
  }

  getNombresTrabajadores(trabajadores: any[]): string {
    if (!trabajadores || trabajadores.length === 0) return 'Sin trabajadores';
    return trabajadores.map(t => t.nombre).join(', ');
  }


  async getEstado() {
    try {
      this.estados = await this.estadoService.obtenerLocal('estado');
      // console.log('Estados cargados:', this.estados);
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

  async getFincas() {
    try {
      this.fincas = await this.fincaService.obtenerDtLocal('finca');
    } catch (error) {
      console.error('Error al obtener fincas:', error);
    }
  }

  async getLotes() {
    try {
      this.lotes = await this.lotesService.obtenerDtLocal('fincalotes') || []
      // console.log('Lotes cargados:', this.lotes)
    } catch (error) {
      console.error('Error al cargar los lotes')
      this.lotes = []
    }
  }

  async getTrabajadores() {
    try {
      this.trabajadores = await this.trabajadoresService.obtenerLocal('trabajador')
      this.trabajadoresFilter = [...this.trabajadores]
      console.log(this.trabajadores)
    } catch (error) {
      console.error('Error al cargar los trabajadores')
      this.trabajadores = []
    }
  }

  search() {
    const search = this.searchTrabajador.trim().toLowerCase();
    this.trabajadoresFilter = this.trabajadores.filter(trabajador =>
      trabajador.nombre.toLowerCase().startsWith(search)
    );
  }

  selectTrabajador(trabajador: any) {
    // Evitar duplicados
    if (!this.trabajadoresSeleccionados.find(t => t.id === trabajador.id)) {
      this.trabajadoresSeleccionados.push(trabajador);
    }

    // Limpiar búsqueda
    this.searchTrabajador = '';
    this.trabajadoresFilter = [];
  }

  removeTrabajador(trabajadorId: number) {
    this.trabajadoresSeleccionados = this.trabajadoresSeleccionados.filter(t => t.id !== trabajadorId);
  }

  filter() {
    this.filteredProgramaciones = this.programaciones;

    if (this.filterPriori) {
      this.filteredProgramaciones = this.filteredProgramaciones.filter(p => p.prioridadNombre === this.filterPriori);
    }

    if (this.filterFinca) {
      this.filteredProgramaciones = this.filteredProgramaciones.filter(p => p.fincaNombre === this.filterFinca);
    }

    if (!this.filterPriori && !this.filterFinca) {
      this.toastService.presentToast('No has seleccionado ningún filtro', 'danger', 'top');
    }
  }

  resetFilters() {
    this.filterPriori = null;
    this.filterFinca = null;
    this.filteredProgramaciones = [...this.programaciones];
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

  getEstadoClass(estado: string): string {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return 'estado-pendiente';
      case 'en proceso':
        return 'estado-en-proceso';
      case 'realizado':
        return 'estado-realizado';
      default:
        return '';
    }
  }

  getPrioridadClass(prioridad: string): string {
    switch (prioridad.toLowerCase()) {
      case 'alta':
        return 'prioridad-alta';
      case 'media':
        return 'prioridad-media';
      case 'baja':
        return 'prioridad-baja';
      default:
        return '';
    }
  }

  async getProgramacionUsuario(usuario: string) {
    try {
      this.filteredProgramaciones = await this.programacionService.getProgramaciones('programacion', usuario, null, 1);
    } catch (error) {
      console.error('Error al obtener programaciones:', error);
    }
  }

  nullestados(programacion: Programacion): Estado[] {
    if (!programacion || !programacion.estadoId) {
      return []; // Retorna un arreglo vacío si no hay programación seleccionada
    }

    // Filtra los estados que tienen un ID mayor o igual al estado actual
    return this.estados.filter(e => e.id >= programacion.estadoId);
  }

  async verificarTrabajadores() {
    const datos = await this.promaTrabajador.obtenerLocal('programacion_trabajadores');
    console.log(datos);
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

  async create(baseProgramacionId: number) {
    // Buscar la programación original
    const baseProgramacion = this.programaciones.find(prog => prog.id === baseProgramacionId);

    if (!baseProgramacion) {
      this.toastService.presentToast('No se encontró la programación base', 'danger', 'top');
      return;
    }

    if (this.inputs.invalid || !this.validarLotesSeleccionados() || !this.validarTrabajadoresSeleccionados()) {
      this.toastService.presentToast('Por favor completa todos los campos obligatorios', 'danger', 'top');

      // Marca todos como tocados para mostrar errores
      this.inputs.markAllAsTouched();

      if (!this.validarLotesSeleccionados()) {
        this.toastService.presentToast('Selecciona al menos un lote', 'danger', 'top');
      }

      if (!this.validarTrabajadoresSeleccionados()) {
        this.toastService.presentToast('Selecciona al menos un trabajador', 'danger', 'top');
      }

      return;
    }

    // Calcular el nuevo ID basado en el ID original
    const registrosRelacionados = await this.programacionService.getProgramaciones('programacion', null, baseProgramacionId, -1)
    // const ultimoRegistro = registrosRelacionados.length > 0 ? Math.max(...registrosRelacionados.map(prog => prog.id)) : baseProgramacionId * 1000;
    // const nuevoId = ultimoRegistro + 1; // Generar nuevo ID consecutivo

    const nuevoIdEjecucion = await this.programacionService.getMaxEjecucion('programacion', baseProgramacionId, -1)


    // Calcular la suma de las cantidades de programaciones relacionadas
    const nuevaCantidad = this.inputs.get('cantidad')?.value || 0;

    // Verificar si la suma de cantidades alcanza o supera la cantidad de la programación original
    const cantidadTotal = registrosRelacionados.reduce(
      (suma, prog) => suma + prog.cantidad, 0) + nuevaCantidad; // Incluir la cantidad de la nueva programación

    console.log(cantidadTotal)
    const nuevoEstadoId = cantidadTotal >= baseProgramacion.cantidad ? 3 : 2; // Estado: 3 = Terminado, 2 = En Proceso

    const nuevoLote = this.form.get('lote')?.value || "";

    // Crear la nueva programación tomando como base la original
    const nuevaProgramacion: Programacion = {
      id: nuevoIdEjecucion,
      programacion: baseProgramacion.id,
      fecha: this.inputs.get('fecha')?.value || new Date().toISOString(), // Tomar del formulario o fecha actual
      lote: nuevoLote,
      jornal: this.inputs.get('jornal')?.value || baseProgramacion.jornal,
      cantidad: this.inputs.get('cantidad')?.value != null ? this.inputs.get('cantidad')?.value : baseProgramacion.cantidad,
      habilitado: 1, // Activado por defecto
      sincronizado: 0,
      fecSincronizacion: new Date().toISOString(), // Fecha de sincronización vacía
      observacion: this.inputs.get('observaciones')?.value || baseProgramacion.observacion,
      signo: -1,
      maquina: '',
      usuario: baseProgramacion.usuario, // Cambiar según lógica de autenticación
      usuarioMod: localStorage.getItem('userName'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sucursalId: baseProgramacion.sucursalId,
      responsableId: baseProgramacion.responsableId,
      fincaId: baseProgramacion.fincaId,
      actividadId: baseProgramacion.actividadId,
      estadoId: nuevoEstadoId, // Usar el estado calculado
      prioridadId: baseProgramacion.prioridadId,
      trabajadores: this.trabajadoresSeleccionados.map(t => ({ trabajadorId: t.id }))
    };

    console.log(nuevaProgramacion)

    try {
      const actualizaciones: Programacion[] = [];

      // Si ya se completó la programación original, actualizar TODAS las programaciones relacionadas
      if (nuevoEstadoId === 3) {
        registrosRelacionados.forEach(prog => {
          actualizaciones.push({
            ...prog,
            estadoId: 3,
            updatedAt: new Date().toISOString(),
            usuarioMod: localStorage.getItem('userName')
          });
        });

        // También actualizar la programación original
        actualizaciones.push({
          ...baseProgramacion,
          estadoId: 3,
          updatedAt: new Date().toISOString(),
          usuarioMod: localStorage.getItem('userName')
        });
        // Guardar los cambiosFcre
        await this.programacionService.updateEst(actualizaciones, 'programacion');
      }

      else if (nuevoEstadoId === 2) {
        registrosRelacionados.forEach(prog => {
          actualizaciones.push({
            ...prog,
            estadoId: 2,
            updatedAt: new Date().toISOString(),
            usuarioMod: localStorage.getItem('userName')
          });
        });

        // También actualizar la programación original
        actualizaciones.push({
          ...baseProgramacion,
          estadoId: 2,
          updatedAt: new Date().toISOString(),
          usuarioMod: localStorage.getItem('userName')
        });
        // Guardar los cambios
        await this.programacionService.updateEst(actualizaciones, 'programacion');
      }

      // Insertar la nueva programación en la base de datos
      await this.programacionService.create([nuevaProgramacion], 'programacion');
      await this.promaTrabajador.create(nuevaProgramacion.trabajadores.map(t => ({
        programacionId: nuevaProgramacion.id,
        trabajadorId: t.trabajadorId,
        sincronizado: 0
      })), 'programacion_trabajadores');

      console.log([nuevaProgramacion])
      console.log(this.verificarTrabajadores())

      this.toastService.presentToast('Registro realizado', 'success', 'top');
      this.getprogramacion(); // Actualizar la lista de programaciones
      this.inputs.reset();
      this.trabajadoresSeleccionados = [];
      this.searchTrabajador = '';
      this.onCloseForm();
    } catch (error) {
      console.error('Error al crear nueva programación:', error);
      this.toastService.presentToast('Error al crear nueva programación', 'danger', 'top');
    }
  }

}
