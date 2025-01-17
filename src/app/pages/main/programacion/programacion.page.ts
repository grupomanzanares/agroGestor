import { Component, OnInit } from '@angular/core';
import { Programacion } from 'src/app/models/programacion';
import { ProgramacionService } from 'src/app/services/programacion.service';

@Component({
  selector: 'app-programacion',
  templateUrl: './programacion.page.html',
  styleUrls: ['./programacion.page.scss'],
})
export class ProgramacionPage implements OnInit {

  programaciones: Programacion[] = [];

  constructor(private programacionSevice: ProgramacionService) { }

  ngOnInit() {
    this.getprogramacion()
  }

  getprogramacion(){
    this.programacionSevice.obtenerLocal('programacion')
    console.log('Programaciones obtenidas:', this.programaciones); 
  }

}
