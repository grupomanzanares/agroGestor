import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  @Input() title: string;
  @Input() showback: boolean = false;
  constructor(private router: Router) { }

  ngOnInit() {
    console.log(this.showback)
  }

  menu(){
    this.router.navigate(['/main'])
  }

}
