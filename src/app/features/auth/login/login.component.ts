import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  readonly loginForm: FormGroup = this.fb.group({
    username: ['admin', [Validators.required]],
    password: ['Admin2026*', [Validators.required, Validators.minLength(4)]],
    rememberMe: [true]
  });

  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);
  readonly showForgotModal = signal(false);
  readonly forgotInput = signal('');
  readonly isForgotSubmitting = signal(false);

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  fillDemoCredentials(role: 'admin' | 'operario') {
    if (role === 'admin') {
      this.loginForm.patchValue({
        username: 'admin',
        password: 'Admin2026*'
      });
      this.notification.info('Credenciales Cargadas', 'Super Administrador (admin)');
    } else {
      this.loginForm.patchValue({
        username: 'operario',
        password: 'Operario2026*'
      });
      this.notification.info('Credenciales Cargadas', 'Operario de Planta (operario)');
    }
  }

  enterDemoMode(role: 'admin' | 'operario' = 'admin') {
    const username = this.loginForm.get('username')?.value || (role === 'admin' ? 'admin' : 'operario');
    this.auth.loginDemo(username, role);
    this.router.navigate(['/dashboard']);
  }

  onSubmit() {
    if (this.loginForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const { username, password } = this.loginForm.value;

    this.auth.login({ username, password }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  submitForgotPassword() {
    if (!this.forgotInput() || this.isForgotSubmitting()) return;
    this.isForgotSubmitting.set(true);
    this.auth.forgotPassword({ emailOrUsername: this.forgotInput() }).subscribe({
      next: () => {
        this.isForgotSubmitting.set(false);
        this.showForgotModal.set(false);
        this.notification.success('Solicitud enviada', 'Si el usuario existe, se enviará un enlace de restablecimiento');
      },
      error: () => {
        this.isForgotSubmitting.set(false);
        this.showForgotModal.set(false);
        this.notification.info('Solicitud procesada', 'Revise su bandeja de correo si la cuenta es válida');
      }
    });
  }
}
