import { ValidationRule } from '../validation-rule.interface';

export class MaxLengthRule implements ValidationRule {
  constructor(private readonly max: number) {}

  validate(value: unknown): string | null {
    if (typeof value !== 'string' || value.length > this.max) {
      return 'max.length';
    }
    return null;
  }
}
