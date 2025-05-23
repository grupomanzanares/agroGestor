export class Programacion{
    id: number;
    programacion: number;
    fecha: string;
    lote: string;
    trabajador?: string
    jornal: number;
    cantidad: number;
    habilitado: number;
    sincronizado: number;
    fecSincronizacion: string;
    observacion: string;
    signo: number;
    maquina: string;
    usuario: string;
    usuarioMod: string;
    createdAt: string;
    updatedAt: string;
    sucursalId: number;
    responsableId: number;
    fincaId: number;
    actividadId: number;
    estadoId: number;
    prioridadId: number;
    actividadNombre?: string
    fincaNombre?: string;
    sucursalNombre?: string;
    responsableNombre?: string;
    estadoNombre?: string;
    prioridadNombre?: string;
    trabajadorNombre?: string;
    trabajadores?: {
        trabajadorId: number;
        id?: number
      }[];
}