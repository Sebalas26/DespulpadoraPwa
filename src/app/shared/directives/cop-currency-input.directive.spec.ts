import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CopCurrencyInputDirective } from './cop-currency-input.directive';

/**
 * Host test component for `CopCurrencyInputDirective`.
 */
@Component({
  standalone: true,
  imports: [FormsModule, CopCurrencyInputDirective],
  template: `<input appCopInput [appCopPrefix]="prefix" [(ngModel)]="amount" />`
})
class TestCopHostComponent {
  amount: number = 0;
  prefix: boolean = true;
}

/**
 * Unit test suite for `CopCurrencyInputDirective`.
 */
describe('CopCurrencyInputDirective', () => {
  let fixture: ComponentFixture<TestCopHostComponent>;
  let host: TestCopHostComponent;
  let inputEl: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestCopHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestCopHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    inputEl = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  });

  it('should configure numeric input attributes and format initial value', async () => {
    await fixture.whenStable();
    expect(inputEl.getAttribute('type')).toBe('text');
    expect(inputEl.getAttribute('inputmode')).toBe('numeric');
    expect(inputEl.value).toContain('0');
  });

  it('should parse digits on input event and update ngModel numeric value', () => {
    inputEl.value = '$ 12.500';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.amount).toBe(12500);
    expect(inputEl.value).toContain('12.500');
  });

  it('should reset to zero when input is cleared and format zero on blur', () => {
    inputEl.value = '';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.amount).toBe(0);
    expect(inputEl.value).toBe('');

    inputEl.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(inputEl.value).toBe('$ 0');
  });

  it('should format without currency prefix when appCopPrefix is false', async () => {
    host.prefix = false;
    host.amount = 4500;
    fixture.detectChanges();
    await fixture.whenStable();

    inputEl.value = '4500';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(inputEl.value).toBe('4.500');
  });
});
