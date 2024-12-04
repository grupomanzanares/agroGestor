import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { CustomInputComponent } from './components/custom-input/custom-input.component';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SecondaryHeaderComponent } from './components/secondary-header/secondary-header.component';



@NgModule({
  declarations: [
    HeaderComponent,
    CustomInputComponent,
    SecondaryHeaderComponent
  ],
  exports:[
    HeaderComponent,
    CustomInputComponent,
    SecondaryHeaderComponent,
    ReactiveFormsModule
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormsModule 
  ]
})
export class SharedModule { }
