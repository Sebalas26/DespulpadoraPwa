import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService } from './notification.service';

/**
 * Unit test suite for `NotificationService`.
 */
describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService]
    });
    service = TestBed.inject(NotificationService);
  });

  it('should enqueue success, error, warning, and info toasts', () => {
    service.success('Saved', 'Operation completed');
    service.error('Error', 'Something failed');
    service.warning('Warning', 'Check input');
    service.info('Info', 'Update available');

    expect(service.toasts().length).toBe(4);
    expect(service.toasts()[0].type).toBe('success');
    expect(service.toasts()[1].type).toBe('error');
    expect(service.toasts()[2].type).toBe('warning');
    expect(service.toasts()[3].type).toBe('info');
  });

  it('should automatically remove toast after duration expires', fakeAsync(() => {
    service.show('info', 'Auto Dismiss', 'Message', 1000);
    expect(service.toasts().length).toBe(1);

    tick(1001);
    expect(service.toasts().length).toBe(0);
  }));

  it('should remove a specific toast by id and clear all toasts', () => {
    service.show('success', 'First', '', 0);
    service.show('info', 'Second', '', 0);
    const firstId = service.toasts()[0].id;

    service.remove(firstId);
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].title).toBe('Second');

    service.clear();
    expect(service.toasts().length).toBe(0);
  });
});
