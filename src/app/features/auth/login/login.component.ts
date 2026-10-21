import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment';

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
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  readonly loginForm: FormGroup = this.fb.group({
    username: ['admin', [Validators.required]],
    password: ['123456', [Validators.required]],
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

  onSubmit() {
    if (this.isSubmitting()) return;

    const rawUsername = (this.loginForm.get('username')?.value || '').trim() || 'usuario';
    const rawPassword = this.loginForm.get('password')?.value || '1234';

    this.isSubmitting.set(true);
    this.auth.login({ username: rawUsername, password: rawPassword }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/dashboard']);
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
