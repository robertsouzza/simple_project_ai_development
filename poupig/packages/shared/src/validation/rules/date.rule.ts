import { ValidationRule } from '../validation-rule.interface';

export class DateRule implements ValidationRule {
  validate(value: unknown): string | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? 'invalid.date' : null;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? 'invalid.date' : null;
    }
    return 'invalid.date';
  }
}
