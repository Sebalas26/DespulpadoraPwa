import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StateService } from '../../../core/services/state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthResponseDto } from '../../../core/models/auth.models';
import { environment } from '../../../../environments/environment';

/**
 * Authentication login screen component connected to `POST /api/auth/login`.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  readonly environment = environment;
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly stateService = inject(StateService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  readonly loginForm: FormGroup = this.fb.group({
    usernameOrEmail: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [true]
  });

  readonly isSubmitting = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly showForgotModal = signal<boolean>(false);
  readonly forgotInput = signal<string>('');
  readonly isForgotSubmitting = signal<boolean>(false);

  /**
   * Toggles password field visibility between masked and plain text.
   */
  togglePasswordVisibility(): void {
    try {
      this.showPassword.update(v => !v);
    } catch {
      return;
    }
  }

  /**
   * Updates the password recovery input signal from a native input event.
   */
  onForgotInputChange(event: Event): void {
    try {
      const target = event.target as HTMLInputElement | null;
      this.forgotInput.set(target?.value ?? '');
    } catch {
      return;
    }
  }

  /**
   * Submits user credentials to `POST /api/auth/login` and initializes the RBAC session.
   */
  onSubmit(): void {
    try {
      if (this.isSubmitting()) {
        return;
      }

      const rawIdentifier = String(this.loginForm.get('usernameOrEmail')?.value ?? '').trim();
      const rawPassword = String(this.loginForm.get('password')?.value ?? '');

      if (!rawIdentifier || !rawPassword) {
        this.errorMessage.set('Debes ingresar tu usuario o correo electrónico y tu contraseña.');
        this.notification.warning('Credenciales requeridas', 'Ingresa tu usuario/correo y contraseña.');
        return;
      }

      this.errorMessage.set('');
      this.isSubmitting.set(true);

      this.auth.login({ usernameOrEmail: rawIdentifier, password: rawPassword }).subscribe({
        next: (session: AuthResponseDto) => {
          this.isSubmitting.set(false);
          this.stateService.refreshAll();
          const firstRoute = session.navigationModules?.[0]?.frontendRoute || '/dashboard';
          this.router.navigateByUrl(firstRoute);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          const backendMsg =
            (err.error && typeof err.error === 'object' && 'message' in err.error
              ? String((err.error as Record<string, unknown>)['message'])
              : '') || 'Usuario, correo o contraseña incorrectos.';
          this.errorMessage.set(backendMsg);
          this.notification.error('Error de Autenticación', backendMsg);
        }
      });
    } catch {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Submits a password recovery request via `POST /api/auth/forgot-password`.
   */
  submitForgotPassword(): void {
    try {
      if (!this.forgotInput() || this.isForgotSubmitting()) {
        return;
      }
      this.isForgotSubmitting.set(true);
      this.auth.forgotPassword({ emailOrUsername: this.forgotInput() }).subscribe({
        next: () => {
          this.isForgotSubmitting.set(false);
          this.showForgotModal.set(false);
          this.notification.success(
            'Solicitud enviada',
            'Si el usuario existe, se enviará un enlace de restablecimiento'
          );
        },
        error: () => {
          this.isForgotSubmitting.set(false);
          this.showForgotModal.set(false);
          this.notification.info(
            'Solicitud procesada',
            'Revise su bandeja de correo si la cuenta es válida'
          );
        }
      });
    } catch {
      this.isForgotSubmitting.set(false);
    }
  }
}
