import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { ClientPortalAdminComponent } from './client-portal-admin.component';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';

/**
 * Unit test suite for `ClientPortalAdminComponent`.
 */
describe('ClientPortalAdminComponent', () => {
  let component: ClientPortalAdminComponent;
  let fixture: ComponentFixture<ClientPortalAdminComponent>;
  let stateService: StateService;
  let notificationService: NotificationService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ClientPortalAdminComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientPortalAdminComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(StateService);
    notificationService = TestBed.inject(NotificationService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create and initialize with empty catalog and zero visible cards', () => {
    expect(component).toBeTruthy();
    expect(component.visibleCardsCount()).toBe(0);
    expect(component.filteredFruits().length).toBe(0);
  });

  it('should toggle banner editor and save banner configuration', () => {
    expect(component.showBannerEditor()).toBeFalse();
    component.toggleBannerEditor();
    expect(component.showBannerEditor()).toBeTrue();

    component.bannerDraft.heroTitle = 'Updated Portal Banner';
    component.saveBannerConfig();
    expect(component.showBannerEditor()).toBeFalse();
    expect(stateService.portalCmsConfig().heroTitle).toBe('Updated Portal Banner');
  });

  it('should open new card modal with empty fields and zero prices, validate name, and create a card', () => {
    const warnSpy = spyOn(notificationService, 'warning');
    component.openNewCardModal();
    expect(component.showCardModal()).toBeTrue();
    expect(component.isCreatingNewCard()).toBeTrue();
    expect(component.activeDraft()?.name).toBe('');
    expect(component.activeDraft()?.prices['g140']).toBe(0);

    component.saveModalCard();
    expect(warnSpy).toHaveBeenCalled();
    expect(component.showCardModal()).toBeTrue();

    const draft = component.activeDraft()!;
    draft.name = 'Lulo Especial';
    draft.category = 'Acida';
    draft.prices = { g140: 1800, g250: 3200, g500: 6000, g1000: 11000 };
    component.activeDraft.set({ ...draft });

    component.saveModalCard();
    expect(component.showCardModal()).toBeFalse();
    expect(stateService.fruits().length).toBe(1);
    expect(stateService.fruits()[0].name).toBe('Lulo Especial');
  });

  it('should filter cards by category and search query, and allow inline updates and deletion', () => {
    const card = stateService.createFruitCatalogCard({
      name: 'Mora Silvestre',
      scientificName: 'Rubus glaucus',
      description: 'Pulpa natural',
      category: 'Dulce',
      color: '#9333EA',
      prices: { g140: 1500, g250: 2800, g500: 5200, g1000: 9800 }
    });

    expect(component.categories()).toContain('Dulce');
    component.selectedCategory.set('Dulce');
    expect(component.filteredFruits().length).toBe(1);

    component.searchQuery.set('mora');
    expect(component.filteredFruits().length).toBe(1);

    component.updateInlineField(card, 'name', 'Mora Premium');
    expect(stateService.fruits()[0].name).toBe('Mora Premium');

    component.updateInlinePrice(card, 'g250', 3100);
    expect(stateService.fruits()[0].prices.g250).toBe(3100);

    component.toggleCardVisibility(stateService.fruits()[0]);
    expect(stateService.fruits()[0].isVisibleInPortal).toBeFalse();

    component.openEditCardModal(stateService.fruits()[0]);
    expect(component.showCardModal()).toBeTrue();
    component.deleteActiveCard();
    expect(stateService.fruits().length).toBe(0);
  });

  it('should navigate to live portal on openLivePortal', () => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.openLivePortal();
    expect(navSpy).toHaveBeenCalledWith(['/portal-clientes']);
  });

  it('should not render floating brand or preview seal over product image in modal preview and catalog cards', () => {
    stateService.createFruitCatalogCard({
      name: 'Pina Especial',
      scientificName: 'Ananas comosus',
      description: 'Pulpa de pina',
      category: 'PULPAS',
      color: '#eab308',
      prices: { g140: 2000, g250: 3500, g500: 6500, g1000: 12000 }
    });

    component.openNewCardModal();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.preview-seal')).toBeNull();
    expect(compiled.querySelector('.brand-seal')).toBeNull();
  });

  it('should synchronize active grammages when deleted or deactivated in stateService and keep modal header isolated from scroll', () => {
    expect(component.activeGrammages().some(g => g.key === 'g500')).toBeTrue();
    expect(component.activeGrammages().some(g => g.key === 'g1000')).toBeTrue();

    stateService.deleteGrammage('g500');
    stateService.toggleGrammage('g1000');
    fixture.detectChanges();

    expect(component.activeGrammages().some(g => g.key === 'g500')).toBeFalse();
    expect(component.activeGrammages().some(g => g.key === 'g1000')).toBeFalse();

    component.openNewCardModal();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const priceLabels = compiled.querySelectorAll('.modal-prices-grid .form-group label');
    expect(priceLabels.length).toBe(2);
    expect(priceLabels[0].textContent).toContain('140g');
    expect(priceLabels[1].textContent).toContain('250g');

    const modal = compiled.querySelector('.card-edit-modal') as HTMLElement;
    expect(modal).toBeTruthy();
  });
});
