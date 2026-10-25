import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HasPermissionDirective } from './has-permission.directive';
import { AuthService } from '../../core/services/auth.service';
import { LoginResponseDto } from '../../core/models/auth.models';

@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: `
    <button id="btn-dispatch" *appHasPermission="'orders.dispatch'">Despachar</button>
    <button id="btn-delete" *appHasPermission="'orders.delete'">Eliminar</button>
  `
})
class HostPermissionTestComponent {}

/**
 * Unit test suite for `HasPermissionDirective` verifying granular action slug rendering.
 */
describe('HasPermissionDirective', () => {
  let fixture: ComponentFixture<HostPermissionTestComponent>;
  let authService: AuthService;

  const session: LoginResponseDto = {
    accessToken: 'jwt-1',
    refreshToken: 'ref-1',
    expiresAtUtc: '2026-12-31T23:59:59Z',
    user: {
      id: 4,
      username: 'despachador',
      email: 'despacho@pulpafresca.com',
      fullName: 'Despachador Rutas',
      roleId: 4,
      roleName: 'Despachador',
      isSystemDeveloper: false
    },
    navigationModules: [
      {
        moduleId: 3,
        name: 'Pedidos',
        slug: 'orders',
        menuSection: 'Operación',
        frontendRoute: '/orders',
        icon: 'truck',
        displayOrder: 1,
        allowedActionSlugs: ['orders.view', 'orders.dispatch']
      }
    ]
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HostPermissionTestComponent],
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    authService.persistLoginSession(session, false);
    fixture = TestBed.createComponent(HostPermissionTestComponent);
    fixture.detectChanges();
  });

  it('should render elements with authorized action slugs and hide unauthorized ones', () => {
    const dispatchBtn = fixture.nativeElement.querySelector('#btn-dispatch');
    const deleteBtn = fixture.nativeElement.querySelector('#btn-delete');

    expect(dispatchBtn).not.toBeNull();
    expect(deleteBtn).toBeNull();
  });
});

