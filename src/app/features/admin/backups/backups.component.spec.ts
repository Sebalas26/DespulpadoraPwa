import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BackupsComponent } from './backups.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatabaseBackupInfoDto } from '../../../core/models/business.models';

/**
 * Unit test suite for `BackupsComponent` verifying 1-click `.sql` backup generation,
 * immediate local browser download, listing, and manual server deletion.
 */
describe('BackupsComponent', () => {
  let component: BackupsComponent;
  let fixture: ComponentFixture<BackupsComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;

  const sampleBackup: DatabaseBackupInfoDto = {
    fileName: 'backup_DespulpadoraDb_20261025_120000.sql',
    sizeBytes: 51200,
    sizeFormatted: '50.00 KB',
    databaseName: 'DespulpadoraDb',
    tablesCount: 24,
    totalRowsCount: 380,
    durationMs: 145,
    createdAtUtc: '2026-10-25T12:00:00Z',
    createdByUsername: 'superadmin'
  };

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', [
      'getDatabaseBackups',
      'createDatabaseBackup',
      'downloadDatabaseBackup',
      'deleteDatabaseBackup'
    ]);
    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'info'
    ]);

    apiSpy.getDatabaseBackups.and.returnValue(of([sampleBackup]));
    apiSpy.createDatabaseBackup.and.returnValue(
      of({
        ...sampleBackup,
        fileName: 'backup_DespulpadoraDb_20261025_130000.sql'
      })
    );
    apiSpy.downloadDatabaseBackup.and.returnValue(
      of(new Blob(['-- SQL DUMP'], { type: 'application/sql' }))
    );
    apiSpy.deleteDatabaseBackup.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [BackupsComponent],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: NotificationService, useValue: notificationSpy },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            isSystemDeveloper: () => true,
            hasPermission: () => true
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BackupsComponent);
    component = fixture.componentInstance;
    spyOn(component, 'triggerBrowserFileDownload');
    fixture.detectChanges();
  });

  it('should load existing server .sql backups on initialization', () => {
    expect(apiSpy.getDatabaseBackups).toHaveBeenCalled();
    expect(component.backups().length).toBe(1);
    expect(component.backups()[0].fileName).toBe('backup_DespulpadoraDb_20261025_120000.sql');
  });

  it('should generate a new .sql backup on the server and automatically download it in 1 click', () => {
    component.generateAndDownloadOneClickBackup();

    expect(apiSpy.createDatabaseBackup).toHaveBeenCalled();
    expect(apiSpy.downloadDatabaseBackup).toHaveBeenCalledWith(
      'backup_DespulpadoraDb_20261025_130000.sql'
    );
    expect(component.triggerBrowserFileDownload).toHaveBeenCalled();
    expect(component.backups().length).toBe(2);
  });

  it('should delete a .sql backup from the server only when requested by the SuperAdmin', () => {
    component.deleteBackupFromServer('backup_DespulpadoraDb_20261025_120000.sql');

    expect(apiSpy.deleteDatabaseBackup).toHaveBeenCalledWith(
      'backup_DespulpadoraDb_20261025_120000.sql'
    );
    expect(component.backups().length).toBe(0);
  });
});

