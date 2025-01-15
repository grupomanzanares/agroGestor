import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgramacionPage } from './programacion.page';

describe('ProgramacionPage', () => {
  let component: ProgramacionPage;
  let fixture: ComponentFixture<ProgramacionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProgramacionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
