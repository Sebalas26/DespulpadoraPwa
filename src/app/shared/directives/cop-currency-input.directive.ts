import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  Renderer2,
  forwardRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * ControlValueAccessor directive that formats numeric input values as Colombian Peso (COP) currency.
 */
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
  @Input() appCopPrefix: boolean = true;

  private onChange: (val: number) => void = () => {};
  private onTouched: () => void = () => {};
  private currentNumericValue: number = 0;

  /**
   * Injects the host input element reference and DOM renderer.
   */
  constructor(
    private readonly el: ElementRef<HTMLInputElement>,
    private readonly renderer: Renderer2
  ) {}

  /**
   * Configures numeric input attributes on the host element.
   */
  ngOnInit(): void {
    try {
      const input = this.el.nativeElement;
      this.renderer.setAttribute(input, 'type', 'text');
      this.renderer.setAttribute(input, 'inputmode', 'numeric');
      this.renderer.setAttribute(input, 'autocomplete', 'off');
    } catch {
      return;
    }
  }

  /**
   * Writes an external numeric model value into the formatted input element.
   */
  writeValue(value: number | string | null | undefined): void {
    try {
      const numeric = this.parseDigits(value);
      this.currentNumericValue = numeric;
      this.el.nativeElement.value = this.formatValue(
        numeric,
        value === null || value === undefined || value === ''
      );
    } catch {
      return;
    }
  }

  /**
   * Registers the callback invoked when the numeric value changes.
   */
  registerOnChange(fn: (val: number) => void): void {
    try {
      this.onChange = fn;
    } catch {
      return;
    }
  }

  /**
   * Registers the callback invoked when the input is blurred.
   */
  registerOnTouched(fn: () => void): void {
    try {
      this.onTouched = fn;
    } catch {
      return;
    }
  }

  /**
   * Toggles the disabled property on the host input element.
   */
  setDisabledState(isDisabled: boolean): void {
    try {
      this.renderer.setProperty(this.el.nativeElement, 'disabled', isDisabled);
    } catch {
      return;
    }
  }

  /**
   * Parses raw digits on user input, formats the display string, and emits the numeric value.
   */
  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    try {
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
    } catch {
      return;
    }
  }

  /**
   * Marks the control as touched and normalizes empty zero values on blur.
   */
  @HostListener('blur')
  onBlur(): void {
    try {
      this.onTouched();
      const input = this.el.nativeElement;
      if (!input.value.trim() && this.currentNumericValue === 0) {
        input.value = this.formatValue(0, false);
      }
    } catch {
      return;
    }
  }

  /**
   * Extracts a non-negative integer from a number or string input.
   */
  private parseDigits(val: number | string | null | undefined): number {
    try {
      if (typeof val === 'number') {
        return Number.isFinite(val) ? Math.max(0, Math.round(val)) : 0;
      }
      if (typeof val === 'string') {
        const digits = val.replace(/\D+/g, '');
        return digits ? parseInt(digits, 10) || 0 : 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Formats a number using Colombian thousands separators and optional currency prefix.
   */
  private formatValue(num: number, isEmptyInitial: boolean): string {
    try {
      if (isEmptyInitial && num === 0) {
        return this.appCopPrefix ? '$ 0' : '0';
      }
      const formatted = new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 0
      }).format(num || 0);
      return this.appCopPrefix ? `$ ${formatted}` : formatted;
    } catch {
      return this.appCopPrefix ? '$ 0' : '0';
    }
  }
}
