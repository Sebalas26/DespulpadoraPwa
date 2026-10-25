import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app';
import { PwaUpdateService } from './core/services/pwa-update.service';

/**
 * Unit test suite for the root `AppComponent`.
 */
describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let pwaUpdateSpy: jasmine.SpyObj<PwaUpdateService>;

  beforeEach(async () => {
    pwaUpdateSpy = jasmine.createSpyObj<PwaUpdateService>('PwaUpdateService', ['init']);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: PwaUpdateService, useValue: pwaUpdateSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the root component and initialize PwaUpdateService on ngOnInit', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(pwaUpdateSpy.init).toHaveBeenCalledTimes(1);
  });

  it('should ignore document clicks on desktop viewports', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1280);
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    row.appendChild(cell);
    tbody.appendChild(row);
    tableWrapper.appendChild(tbody);

    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: cell });

    component.onDocumentClick(event);
    expect(row.classList.contains('mobile-row-expanded')).toBeFalse();
  });

  it('should toggle mobile-row-expanded class when clicking a table row on mobile viewport', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(480);
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    row.appendChild(cell);
    tbody.appendChild(row);
    tableWrapper.appendChild(tbody);

    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: cell });

    component.onDocumentClick(event);
    expect(row.classList.contains('mobile-row-expanded')).toBeTrue();

    component.onDocumentClick(event);
    expect(row.classList.contains('mobile-row-expanded')).toBeFalse();
  });

  it('should not toggle row expansion when clicking an interactive button inside a row', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(480);
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    const button = document.createElement('button');
    cell.appendChild(button);
    row.appendChild(cell);
    tbody.appendChild(row);
    tableWrapper.appendChild(tbody);

    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: button });

    component.onDocumentClick(event);
    expect(row.classList.contains('mobile-row-expanded')).toBeFalse();
  });
});
