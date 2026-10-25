import { TestBed } from '@angular/core/testing';
import { GeocodingService } from './geocoding.service';

/**
 * Unit test suite for `GeocodingService` covering coordinate extraction,
 * Colombian road address normalization, zone detection, and grid fallback estimation.
 */
describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GeocodingService]
    });
    service = TestBed.inject(GeocodingService);
  });

  it('should extract direct coordinates from raw text and Google Maps URLs', () => {
    const direct = service.extractCoordinatesFromInput('4.6765, -74.0538');
    expect(direct).toEqual({ lat: 4.6765, lng: -74.0538 });

    const mapsUrl = service.extractCoordinatesFromInput(
      'https://www.google.com/maps/place/Test/@4.68512,-74.04891,17z!3d4.68555!4d-74.04999'
    );
    expect(mapsUrl).toEqual({ lat: 4.68555, lng: -74.04999 });

    const invalid = service.extractCoordinatesFromInput('Calle 93 # 13-25');
    expect(invalid).toBeNull();
  });

  it('should parse and normalize Colombian street nomenclature accurately', () => {
    const parsed = service.parseColombianAddress('Cra 15 No. 93-40 Apto 302');
    expect(parsed.mainRoadType).toBe('Carrera');
    expect(parsed.mainRoadNum).toBe(15);
    expect(parsed.crossRoadNum).toBe(93);
    expect(parsed.plaqueMeters).toBe(40);
    expect(parsed.cleaned).toBe('Carrera 15 # 93-40');
  });

  it('should detect Bogotá and Cundinamarca zones from coordinates', () => {
    expect(service.detectBogotaZone(4.86, -74.05)).toContain('Chía');
    expect(service.detectBogotaZone(4.67, -74.05)).toContain('Chicó');
  });

  it('should return empty array for queries shorter than 3 characters', async () => {
    const res = await service.searchAddress('ab');
    expect(res).toEqual([]);
  });

  it('should resolve direct coordinate queries without failing when offline', async () => {
    spyOn(window, 'fetch').and.returnValue(Promise.reject(new Error('Network offline')));
    const best = await service.geocodeBestMatch('4.6765, -74.0538');
    expect(best).not.toBeNull();
    expect(best?.source).toBe('coords');
    expect(best?.lat).toBe(4.6765);
  });

  it('should fall back to Bogotá urban grid estimation when external providers fail', async () => {
    spyOn(window, 'fetch').and.returnValue(Promise.reject(new Error('Network offline')));
    const results = await service.searchAddress('Calle 93 # 13-25');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source).toBe('bogota-grid');
  });
});
