import {
  Directive,
  ElementRef,
  forwardRef,
  HostListener,
  Input,
  OnInit,
  Renderer2
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'input[appCopInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CopCurrencyInputDirective),
      multi: true
    }
  ]
})
export class CopCurrencyInputDirective implements ControlValueAccessor, OnInit {
  /** Whether to include the "$ " prefix inside the input value (default: true) */
  @Input() appCopPrefix = true;

  private onChange: (val: number) => void = () => {};
  private onTouched: () => void = () => {};
  private currentNumericValue = 0;

  constructor(
    private readonly el: ElementRef<HTMLInputElement>,
    private readonly renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const input = this.el.nativeElement;
    this.renderer.setAttribute(input, 'type', 'text');
    this.renderer.setAttribute(input, 'inputmode', 'numeric');
    this.renderer.setAttribute(input, 'autocomplete', 'off');
  }

  writeValue(value: number | string | null | undefined): void {
    const numeric = this.parseDigits(value);
    this.currentNumericValue = numeric;
    this.el.nativeElement.value = this.formatValue(numeric, value === null || value === undefined || value === '');
  }

  registerOnChange(fn: (val: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.el.nativeElement, 'disabled', isDisabled);
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = (input.value || '').replace(/\D+/g, '');
    if (!digits) {
      this.currentNumericValue = 0;
      input.value = '';
      this.onChange(0);
      return;
    }

    const numeric = parseInt(digits, 10) || 0;
    this.currentNumericValue = numeric;
    const formatted = this.formatValue(numeric, false);
    if (input.value !== formatted) {
      input.value = formatted;
    }
    this.onChange(numeric);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
    const input = this.el.nativeElement;
    if (!input.value.trim() && this.currentNumericValue === 0) {
      input.value = this.formatValue(0, false);
    }
  }

  private parseDigits(val: number | string | null | undefined): number {
    if (typeof val === 'number') {
      return isFinite(val) ? Math.max(0, Math.round(val)) : 0;
    }
    if (typeof val === 'string') {
      const digits = val.replace(/\D+/g, '');
      return digits ? parseInt(digits, 10) || 0 : 0;
    }
    return 0;
  }

  private formatValue(num: number, isEmptyInitial: boolean): string {
    if (isEmptyInitial && num === 0) {
      return this.appCopPrefix ? '$ 0' : '0';
    }
    const formatted = new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 0
    }).format(num || 0);
    return this.appCopPrefix ? `$ ${formatted}` : formatted;
  }
}
