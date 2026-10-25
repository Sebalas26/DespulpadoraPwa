import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MobileNavComponent } from './mobile-nav.component';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Unit test suite for `MobileNavComponent`.
 */
describe('MobileNavComponent', () => {
  let component: MobileNavComponent;
  let fixture: ComponentFixture<MobileNavComponent>;
  let stateService: StateService;
  let authService: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MobileNavComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(MobileNavComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(StateService);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should open and close the mobile drawer and display dynamic companyName', () => {
    stateService.syncCompanyInfoSilent({ companyName: 'Mobile Plant Co' });
    authService.user.set({
      id: 1,
      username: 'carlos',
      email: 'carlos@example.com',
      fullName: 'Carlos Ruiz',
      roleId: 1,
      roleName: 'Operator',
      isSystemDeveloper: false
    });

    expect(component.showMoreDrawer()).toBeFalse();
    component.openDrawer();
    fixture.detectChanges();

    expect(component.showMoreDrawer()).toBeTrue();
    expect(component.userInitials()).toBe('CR');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.mobile-drawer-header')?.textContent).toContain('Mobile Plant Co');

    component.closeDrawer();
    expect(component.showMoreDrawer()).toBeFalse();
  });

  it('should invoke authService.logout and close drawer on onLogoutClick', () => {
    const logoutSpy = spyOn(authService, 'logout');
    component.openDrawer();
    component.onLogoutClick();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(component.showMoreDrawer()).toBeFalse();
  });
});
