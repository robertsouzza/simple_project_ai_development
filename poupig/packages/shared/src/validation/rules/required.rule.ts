import { ValidationRule } from '../validation-rule';

export class RequiredRule implements ValidationRule {
  public readonly errorCode = 'required';

  validate(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim().length === 0) return false;
    return true;
  }
}
