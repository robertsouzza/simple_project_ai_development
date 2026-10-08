import { ValidationError } from '../error/validation.error';
import { ValidationRule } from './validation-rule';

export class Validator {
  constructor(
    public readonly fieldCode: string,
    public readonly rules: ValidationRule[]
  ) {}

  validate(value: unknown): ValidationError[] {
    const errors: ValidationError[] = [];
    for (const rule of this.rules) {
      if (!rule.validate(value)) {
        errors.push(new ValidationError(this.fieldCode, rule.errorCode));
      }
    }
    return errors;
  }
}
