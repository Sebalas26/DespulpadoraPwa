import { ApplicationRef } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PwaUpdateService } from './pwa-update.service';
import { NotificationService } from './notification.service';

/**
 * Unit test suite for `PwaUpdateService` covering Service Worker update checks,
 * `VERSION_READY` activation, and unrecoverable state recovery.
 */
describe('PwaUpdateService', () => {
  let service: PwaUpdateService;
  let versionUpdates$: Subject<VersionEvent>;
  let unrecoverable$: Subject<UnrecoverableStateEvent>;
  let isStable$: Subject<boolean>;
  let swUpdateMock: {
    isEnabled: boolean;
    versionUpdates: Subject<VersionEvent>;
    unrecoverable: Subject<UnrecoverableStateEvent>;
    checkForUpdate: jasmine.Spy<() => Promise<boolean>>;
    activateUpdate: jasmine.Spy<() => Promise<boolean>>;
  };
  let notificationSpy: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    versionUpdates$ = new Subject<VersionEvent>();
    unrecoverable$ = new Subject<UnrecoverableStateEvent>();
    isStable$ = new Subject<boolean>();

    swUpdateMock = {
      isEnabled: true,
      versionUpdates: versionUpdates$,
      unrecoverable: unrecoverable$,
      checkForUpdate: jasmine.createSpy('checkForUpdate').and.returnValue(Promise.resolve(false)),
      activateUpdate: jasmine.createSpy('activateUpdate').and.returnValue(Promise.resolve(true))
    };

    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', ['info']);

    TestBed.configureTestingModule({
      providers: [
        PwaUpdateService,
        { provide: SwUpdate, useValue: swUpdateMock },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    const appRef: ApplicationRef = TestBed.inject(ApplicationRef);
    spyOnProperty(appRef, 'isStable', 'get').and.returnValue(isStable$.asObservable());
    service = TestBed.inject(PwaUpdateService);
  });

  it('should not subscribe when SwUpdate is disabled', () => {
    swUpdateMock.isEnabled = false;
    service.init();
    isStable$.next(true);
    expect(swUpdateMock.checkForUpdate).not.toHaveBeenCalled();
  });

  it('should check for updates once the application becomes stable', () => {
    service.init();
    isStable$.next(true);
    expect(swUpdateMock.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('should notify and activate update when VERSION_READY event is emitted', fakeAsync(() => {
    const reloadSpy = spyOn(service, 'reloadPage');
    service.init();

    versionUpdates$.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'v1' },
      latestVersion: { hash: 'v2' }
    });

    tick(1300);
    expect(notificationSpy.info).toHaveBeenCalled();
    expect(swUpdateMock.activateUpdate).toHaveBeenCalledTimes(1);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  }));

  it('should reload page when unrecoverable event is emitted', () => {
    const reloadSpy = spyOn(service, 'reloadPage');
    service.init();

    unrecoverable$.next({
      type: 'UNRECOVERABLE_STATE',
      reason: 'Corrupted cache'
    });

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
