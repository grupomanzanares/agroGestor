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
    'email': new FormControl (null, [Validators.required, Validators.email]),
    'password': new FormControl (null, [Validators.required])
  });
  constructor(private formBuilder: FormBuilder,
    private _router: Router
  ) {
  }

  ngOnInit() {
  }

  login(){
    this._router.navigateByUrl('main/home')
    console.log(this.loginFrom.value)
  }

}
