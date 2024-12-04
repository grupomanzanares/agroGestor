import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
  styleUrls: ['./main.page.scss'],
})
export class MainPage implements OnInit {

  currentPath: string = '';
  selectedButton: string = '';

  constructor(private router: Router) { }

  ngOnInit() {
    this.router.events.subscribe((event: any) => {
      if(event?.url) this.currentPath = event.url
    })
  }

  buttonClicked(buttonName: string): void {
    this.selectedButton = buttonName;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

}
