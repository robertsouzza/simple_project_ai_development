import { ValidationRule } from '../validation-rule.interface';

export class MinLengthRule implements ValidationRule {
  constructor(private readonly min: number) {}

  validate(value: unknown): string | null {
    if (typeof value !== 'string' || value.length < this.min) {
      return 'min.length';
    }
    return null;
  }
}
