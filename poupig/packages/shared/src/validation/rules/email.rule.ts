import { ValidationRule } from '../validation-rule.interface';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailRule implements ValidationRule {
  validate(value: unknown): string | null {
    if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
      return 'invalid.email';
    }
    return null;
  }
}
