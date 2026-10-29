import { TestBed } from '@angular/core/testing';
import { ConfirmDialogService, ConfirmDialogOptions } from './confirm-dialog.service';

/**
 * Unit test suite for `ConfirmDialogService`.
 */
describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConfirmDialogService]
    });
    service = TestBed.inject(ConfirmDialogService);
  });

  it('should initialize with dialog closed and default options', () => {
    const state = service.state();
    expect(state.isOpen).toBeFalse();
    expect(state.resolve).toBeNull();
    expect(state.options.title).toBe('Confirmar acción');
  });

  it('should open dialog and resolve true when accept is called', async () => {
    const options: ConfirmDialogOptions = {
      title: 'Eliminar elemento',
      message: '¿Desea eliminar este registro?',
      confirmText: 'Sí, eliminar',
      cancelText: 'No',
      isDanger: true
    };

    const confirmPromise = service.confirm(options);

    expect(service.state().isOpen).toBeTrue();
    expect(service.state().options.title).toBe('Eliminar elemento');
    expect(service.state().options.isDanger).toBeTrue();

    service.accept();

    const result = await confirmPromise;
    expect(result).toBeTrue();
    expect(service.state().isOpen).toBeFalse();
  });

  it('should open dialog and resolve false when cancel is called', async () => {
    const options: ConfirmDialogOptions = {
      title: 'Descartar cambios',
      message: '¿Desea descartar?'
    };

    const confirmPromise = service.confirm(options);

    expect(service.state().isOpen).toBeTrue();

    service.cancel();

    const result = await confirmPromise;
    expect(result).toBeFalse();
    expect(service.state().isOpen).toBeFalse();
  });
});

