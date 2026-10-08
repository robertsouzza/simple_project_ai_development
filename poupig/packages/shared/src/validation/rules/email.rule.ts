import { ValidationRule } from '../validation-rule';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailRule implements ValidationRule {
  public readonly errorCode = 'invalid.email';

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return EMAIL_REGEX.test(value);
  }
}
