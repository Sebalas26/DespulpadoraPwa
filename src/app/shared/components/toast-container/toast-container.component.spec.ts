import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastContainerComponent } from './toast-container.component';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * Unit test suite for `ToastContainerComponent`.
 */
describe('ToastContainerComponent', () => {
  let component: ToastContainerComponent;
  let fixture: ComponentFixture<ToastContainerComponent>;
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
      providers: [NotificationService]
    }).compileComponents();

    fixture = TestBed.createComponent(ToastContainerComponent);
    component = fixture.componentInstance;
    notificationService = TestBed.inject(NotificationService);
  });

  it('should create the component and render active toast items', () => {
    notificationService.show('success', 'Saved', 'Data saved', 0);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(component).toBeTruthy();
    expect(compiled.querySelector('.toast-title')?.textContent).toContain('Saved');
    expect(compiled.querySelector('.toast-message')?.textContent).toContain('Data saved');
  });

  it('should dismiss a toast when onDismissToast is triggered', () => {
    notificationService.show('error', 'Failed', 'Error occurred', 0);
    fixture.detectChanges();

    const toastId = notificationService.toasts()[0].id;
    component.onDismissToast(toastId);
    fixture.detectChanges();

    expect(notificationService.toasts().length).toBe(0);
  });
});
