import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SincronizarPage } from './sincronizar.page';

describe('SincronizarPage', () => {
  let component: SincronizarPage;
  let fixture: ComponentFixture<SincronizarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SincronizarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
