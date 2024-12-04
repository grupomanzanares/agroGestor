import { Component, Input, input, OnInit } from '@angular/core';

@Component({
  selector: 'app-secondary-header',
  templateUrl: './secondary-header.component.html',
  styleUrls: ['./secondary-header.component.scss'],
})
export class SecondaryHeaderComponent  implements OnInit {
  @Input() title: string
  constructor() { }

  ngOnInit() {}

}
