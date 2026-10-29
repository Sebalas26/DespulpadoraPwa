import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

/**
 * Unit test suite for `ConfirmDialogComponent`.
 */
describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let service: ConfirmDialogService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [ConfirmDialogService]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(ConfirmDialogService);
    fixture.detectChanges();
  });

  it('should not display modal markup when dialog is closed', () => {
    const overlay = fixture.nativeElement.querySelector('.confirm-modal-overlay');
    expect(overlay).toBeNull();
  });

  it('should render modal with custom title, message and buttons when opened', () => {
    service.confirm({
      title: 'Eliminar usuario',
      message: '¿Está seguro de eliminar este usuario?',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      isDanger: true
    });
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.confirm-modal-overlay');
    const title = fixture.nativeElement.querySelector('.confirm-modal-title');
    const message = fixture.nativeElement.querySelector('.confirm-modal-message');
    const confirmBtn = fixture.nativeElement.querySelector('.confirm-action-btn');

    expect(overlay).toBeTruthy();
    expect(title?.textContent?.trim()).toBe('Eliminar usuario');
    expect(message?.textContent?.trim()).toBe('¿Está seguro de eliminar este usuario?');
    expect(confirmBtn?.textContent?.trim()).toBe('Sí, eliminar');
    expect(confirmBtn?.classList.contains('btn-danger')).toBeTrue();
  });

  it('should call accept when clicking confirm action button', () => {
    spyOn(service, 'accept');
    service.confirm({
      title: 'Aprobar orden',
      message: '¿Continuar?'
    });
    fixture.detectChanges();

    const confirmBtn = fixture.nativeElement.querySelector('.confirm-action-btn') as HTMLButtonElement;
    confirmBtn.click();

    expect(service.accept).toHaveBeenCalledTimes(1);
  });

  it('should call cancel when clicking cancel button', () => {
    spyOn(service, 'cancel');
    service.confirm({
      title: 'Rechazar orden',
      message: '¿Continuar?'
    });
    fixture.detectChanges();

    const cancelBtn = fixture.nativeElement.querySelector('.confirm-cancel-btn') as HTMLButtonElement;
    cancelBtn.click();

    expect(service.cancel).toHaveBeenCalledTimes(1);
  });

  it('should cancel dialog when pressing escape key', () => {
    spyOn(service, 'cancel');
    service.confirm({
      title: 'Cerrar con escape',
      message: 'Presiona ESC'
    });
    fixture.detectChanges();

    component.onEscapeKey();

    expect(service.cancel).toHaveBeenCalledTimes(1);
  });

  it('should cancel dialog when clicking on backdrop overlay', () => {
    spyOn(service, 'cancel');
    service.confirm({
      title: 'Click fuera',
      message: 'Haz click fuera'
    });
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.confirm-modal-overlay') as HTMLElement;
    overlay.click();

    expect(service.cancel).toHaveBeenCalledTimes(1);
  });
});

