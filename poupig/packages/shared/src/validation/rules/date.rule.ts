import { ValidationRule } from '../validation-rule';

export class DateRule implements ValidationRule {
  public readonly errorCode = 'invalid.date';

  validate(value: unknown): boolean {
    if (value instanceof Date) return !Number.isNaN(value.getTime());
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return !Number.isNaN(parsed.getTime());
    }
    return false;
  }
}
