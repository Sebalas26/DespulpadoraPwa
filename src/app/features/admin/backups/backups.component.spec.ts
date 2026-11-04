import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BackupsComponent } from './backups.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatabaseBackupInfoDto } from '../../../core/models/business.models';

/**
 * Unit test suite for `BackupsComponent` verifying 1-click backup creation,
 * automatic browser download, real-time search, sorting, pagination, friendly formatting,
 * and custom confirmation modal deletion.
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

  const secondBackup: DatabaseBackupInfoDto = {
    fileName: 'backup_DespulpadoraDb_20261103_204238.sql',
    sizeBytes: 1048576,
    sizeFormatted: '1.00 MB',
    databaseName: 'DespulpadoraDb',
    tablesCount: 28,
    totalRowsCount: 0,
    durationMs: 210,
    createdAtUtc: '2026-11-03T20:42:38Z',
    createdByUsername: 'admin.general'
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
            isAuthenticated: (): boolean => true,
            isSystemDeveloper: (): boolean => true,
            hasPermission: (): boolean => true
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BackupsComponent);
    component = fixture.componentInstance;
    spyOn(component, 'triggerBrowserFileDownload');
    fixture.detectChanges();
  });

  it('should load existing server backups on initialization and compute singular KPI label', () => {
    expect(apiSpy.getDatabaseBackups).toHaveBeenCalled();
    expect(component.backups().length).toBe(1);
    expect(component.backups()[0].fileName).toBe('backup_DespulpadoraDb_20261025_120000.sql');
    expect(component.totalBackupsLabel()).toBe('1 copia disponible');
    expect(component.protectionStatus().isProtected).toBeTrue();
    expect(component.protectionStatus().label).toBe('Protección al día');
  });

  it('should generate a new backup on the server and automatically download it in 1 click', () => {
    component.generateAndDownloadOneClickBackup();

    expect(apiSpy.createDatabaseBackup).toHaveBeenCalled();
    expect(apiSpy.downloadDatabaseBackup).toHaveBeenCalledWith(
      'backup_DespulpadoraDb_20261025_130000.sql'
    );
    expect(component.triggerBrowserFileDownload).toHaveBeenCalled();
    expect(component.backups().length).toBe(2);
    expect(component.totalBackupsLabel()).toBe('2 copias disponibles');
  });

  it('should filter backups by search query and clear search filter', () => {
    component.backups.set([sampleBackup, secondBackup]);

    component.onSearchChange('admin.general');
    expect(component.filteredBackups().length).toBe(1);
    expect(component.filteredBackups()[0].fileName).toBe(secondBackup.fileName);

    component.clearSearch();
    expect(component.searchQuery()).toBe('');
    expect(component.filteredBackups().length).toBe(2);
  });

  it('should sort backups by newest, oldest, largest, and smallest', () => {
    component.backups.set([sampleBackup, secondBackup]);

    component.onSortChange('newest');
    expect(component.filteredBackups()[0].fileName).toBe(secondBackup.fileName);

    component.onSortChange('oldest');
    expect(component.filteredBackups()[0].fileName).toBe(sampleBackup.fileName);

    component.onSortChange('largest');
    expect(component.filteredBackups()[0].fileName).toBe(secondBackup.fileName);

    component.onSortChange('smallest');
    expect(component.filteredBackups()[0].fileName).toBe(sampleBackup.fileName);
  });

  it('should paginate backups and navigate between pages', () => {
    const manyBackups: DatabaseBackupInfoDto[] = Array.from({ length: 12 }, (_, idx) => ({
      ...sampleBackup,
      fileName: `backup_DespulpadoraDb_20261025_${idx + 1}.sql`,
      createdAtUtc: new Date(Date.UTC(2026, 9, 25, 12, idx, 0)).toISOString()
    }));
    component.backups.set(manyBackups);
    component.onPageSizeChange(5);

    expect(component.totalPages()).toBe(3);
    expect(component.paginatedBackups().length).toBe(5);
    expect(component.paginationStartIndex()).toBe(1);
    expect(component.paginationEndIndex()).toBe(5);

    component.nextPage();
    expect(component.safeCurrentPage()).toBe(2);
    expect(component.paginationStartIndex()).toBe(6);
    expect(component.paginationEndIndex()).toBe(10);

    component.goToPage(3);
    expect(component.safeCurrentPage()).toBe(3);
    expect(component.paginatedBackups().length).toBe(2);

    component.previousPage();
    expect(component.safeCurrentPage()).toBe(2);
  });

  it('should format backup content in friendly non-technical terms when rows are 0 or positive', () => {
    const withRows = component.getBackupContentSummary(sampleBackup);
    expect(withRows.modulesText).toBe('24 módulos de datos');
    expect(withRows.recordsText).toContain('380');

    const zeroRows = component.getBackupContentSummary(secondBackup);
    expect(zeroRows.modulesText).toBe('28 módulos de datos');
    expect(zeroRows.recordsText).toBe('Estructura completa del sistema');

    expect(component.getUserInitials('admin.general')).toBe('AG');
    expect(component.getUserInitials('superadmin')).toBe('SU');
  });

  it('should open confirmation modal and delete backup when confirmed', () => {
    component.requestDeleteBackup(sampleBackup);
    expect(component.backupPendingDelete()).toEqual(sampleBackup);

    component.cancelDeleteBackup();
    expect(component.backupPendingDelete()).toBeNull();

    component.requestDeleteBackup(sampleBackup);
    component.confirmDeleteBackup();

    expect(apiSpy.deleteDatabaseBackup).toHaveBeenCalledWith(
      'backup_DespulpadoraDb_20261025_120000.sql'
    );
    expect(component.backupPendingDelete()).toBeNull();
    expect(component.backups().length).toBe(0);
    expect(component.protectionStatus().isProtected).toBeFalse();
  });

  it('should delete a .sql backup from the server only when requested by the SuperAdmin', () => {
    component.deleteBackupFromServer('backup_DespulpadoraDb_20261025_120000.sql');

    expect(apiSpy.deleteDatabaseBackup).toHaveBeenCalledWith(
      'backup_DespulpadoraDb_20261025_120000.sql'
    );
    expect(component.backups().length).toBe(0);
  });

  it('should handle API errors gracefully using notifications', () => {
    apiSpy.getDatabaseBackups.and.returnValue(throwError(() => new Error('Network error')));
    component.loadBackups();
    expect(component.isLoading()).toBeFalse();
    expect(notificationSpy.error).toHaveBeenCalled();

    apiSpy.createDatabaseBackup.and.returnValue(throwError(() => new Error('Create error')));
    component.generateAndDownloadOneClickBackup();
    expect(component.isGenerating()).toBeFalse();
    expect(notificationSpy.error).toHaveBeenCalled();

    apiSpy.downloadDatabaseBackup.and.returnValue(throwError(() => new Error('Download error')));
    component.downloadBackupToComputer(sampleBackup.fileName);
    expect(component.downloadingFileName()).toBeNull();
    expect(notificationSpy.error).toHaveBeenCalled();

    apiSpy.deleteDatabaseBackup.and.returnValue(throwError(() => new Error('Delete error')));
    component.deleteBackupFromServer(sampleBackup.fileName);
    expect(component.deletingFileName()).toBeNull();
    expect(notificationSpy.error).toHaveBeenCalled();
  });
});
