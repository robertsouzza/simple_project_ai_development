import { ValidationRule } from '../validation-rule.interface';

export class RequiredRule implements ValidationRule {
  validate(value: unknown): string | null {
    if (value === null || value === undefined) return 'required';
    if (typeof value === 'string' && value.trim().length === 0) return 'required';
    return null;
  }
}
