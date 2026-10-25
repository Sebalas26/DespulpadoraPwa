import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { StateService } from '../../../core/services/state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthResponseDto } from '../../../core/models/auth.models';

/**
 * Unit tests for LoginComponent verifying form validation, authentication, and password recovery flows.
 */
describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let stateServiceSpy: jasmine.SpyObj<StateService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'forgotPassword']);
    stateServiceSpy = jasmine.createSpyObj<StateService>('StateService', ['refreshAll']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'warning',
      'info'
    ]);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: StateService, useValue: stateServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize the reactive login form with empty credentials', () => {
    expect(component).toBeTruthy();
    expect(component.loginForm.get('usernameOrEmail')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
    expect(component.loginForm.get('rememberMe')?.value).toBeTrue();
  });

  it('should toggle password visibility signal', () => {
    expect(component.showPassword()).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBeTrue();
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBeFalse();
  });

  it('should update forgotInput signal when onForgotInputChange is triggered', () => {
    const inputElement = document.createElement('input');
    inputElement.value = 'recover@dgl.com';
    const event = { target: inputElement } as unknown as Event;

    component.onForgotInputChange(event);
    expect(component.forgotInput()).toBe('recover@dgl.com');
  });

  it('should block submission and show warning when credentials are empty', () => {
    component.loginForm.patchValue({ usernameOrEmail: '   ', password: '' });
    component.onSubmit();

    expect(authServiceSpy.login).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Debes ingresar');
    expect(notificationSpy.warning).toHaveBeenCalled();
  });

  it('should authenticate, refresh global state, and navigate to first navigation module route on success', () => {
    const mockSession: AuthResponseDto = {
      success: true,
      token: 'jwt-token',
      expiresAt: '2026-12-31T00:00:00Z',
      userId: 1,
      username: 'admin',
      fullName: 'Administrator',
      email: 'admin@dgl.com',
      roleId: 1,
      roleName: 'Admin',
      isAdmin: true,
      isSuperAdmin: true,
      companyId: 1,
      allowMultipleSessions: true,
      maxActiveSessionsPerUser: 5,
      branches: [],
      permissions: [],
      navigationModules: [
        {
          moduleId: 10,
          name: 'Orders',
          slug: 'orders',
          icon: 'box',
          menuSection: 'OPERACIONES',
          frontendRoute: '/orders',
          displayOrder: 1,
          allowedActionSlugs: []
        }
      ]
    };

    authServiceSpy.login.and.returnValue(of(mockSession));
    component.loginForm.patchValue({ usernameOrEmail: 'admin', password: 'Password123!' });

    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      usernameOrEmail: 'admin',
      password: 'Password123!'
    });
    expect(component.isSubmitting()).toBeFalse();
    expect(stateServiceSpy.refreshAll).toHaveBeenCalled();
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/orders');
  });

  it('should display backend error message when login fails with HttpErrorResponse', () => {
    const httpError = new HttpErrorResponse({
      status: 401,
      error: { message: 'Credenciales inválidas en servidor.' }
    });
    authServiceSpy.login.and.returnValue(throwError(() => httpError));
    component.loginForm.patchValue({ usernameOrEmail: 'admin', password: 'wrong' });

    component.onSubmit();

    expect(component.isSubmitting()).toBeFalse();
    expect(component.errorMessage()).toBe('Credenciales inválidas en servidor.');
    expect(notificationSpy.error).toHaveBeenCalledWith(
      'Error de Autenticación',
      'Credenciales inválidas en servidor.'
    );
  });

  it('should submit forgot password request and close modal on success', () => {
    authServiceSpy.forgotPassword.and.returnValue(of({ message: 'Sent' }));
    component.showForgotModal.set(true);
    component.forgotInput.set('user@dgl.com');

    component.submitForgotPassword();

    expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith({ emailOrUsername: 'user@dgl.com' });
    expect(component.isForgotSubmitting()).toBeFalse();
    expect(component.showForgotModal()).toBeFalse();
    expect(notificationSpy.success).toHaveBeenCalled();
  });

  it('should handle forgot password error gracefully and close modal', () => {
    authServiceSpy.forgotPassword.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );
    component.showForgotModal.set(true);
    component.forgotInput.set('user@dgl.com');

    component.submitForgotPassword();

    expect(component.isForgotSubmitting()).toBeFalse();
    expect(component.showForgotModal()).toBeFalse();
    expect(notificationSpy.info).toHaveBeenCalled();
  });
});
