import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  public loginFrom = new FormGroup({
    'email': new FormControl(null, [Validators.required, Validators.email]),
    'password': new FormControl(null, [Validators.required])
  });
  constructor(private formBuilder: FormBuilder,
    private router: Router
  ) {
  }

  ngOnInit() {
  }

  login() {
    // Simulación de lógica de validación
    const { email, password } = this.loginFrom.value;

    if (email === 'usuario@ejemplo.com' && password === '123456') {
      // Usuario registrado, redirigir a la página principal
      this.router.navigate(['/main']);
    } else {
      // Usuario no registrado, mostrar un mensaje de error
      alert('Usuario no registrado o credenciales incorrectas.');
    }
  }

}
