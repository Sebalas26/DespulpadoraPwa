import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

/**
 * Structural directive (`*appHasPermission="'orders.dispatch'"`) that conditionally renders
 * view elements when the authenticated user possesses the specified granular action slug
 * within their authorized `navigationModules` or has `isSystemDeveloper === true`.
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);

  private readonly requiredSlugs = signal<string[]>([]);
  private hasView = false;

  /**
   * Sets the required action slug or list of action slugs to evaluate.
   */
  @Input()
  set appHasPermission(value: string | string[]) {
    try {
      if (Array.isArray(value)) {
        this.requiredSlugs.set(value.filter(Boolean));
      } else if (typeof value === 'string' && value.trim().length > 0) {
        this.requiredSlugs.set([value.trim()]);
      } else {
        this.requiredSlugs.set([]);
      }
    } catch {
      this.requiredSlugs.set([]);
    }
  }

  /**
   * Initializes the directive and registers a reactive effect to update the host view on permission changes.
   */
  constructor() {
    effect(() => {
      this.evaluatePermissionView();
    });
  }

  /**
   * Evaluates current user action permissions reactively and updates the host view container.
   */
  private evaluatePermissionView(): void {
    try {
      const slugs = this.requiredSlugs();
      const isAllowed =
        slugs.length === 0 ||
        this.authService.isSystemDeveloper() ||
        slugs.some((slug: string) => this.authService.hasPermission(slug));

      if (isAllowed && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!isAllowed && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    } catch {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

