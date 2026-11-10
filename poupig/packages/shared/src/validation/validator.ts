import { ValidationError } from '../error/validation.error';
import { ValidationRule } from './validation-rule.interface';

export interface FieldValidation {
  fieldCode: string;
  value: unknown;
  rules: ValidationRule[];
}

export class Validator {
  validate(fields: FieldValidation[]): ValidationError[] {
    const errors: ValidationError[] = [];
    for (const field of fields) {
      for (const rule of field.rules) {
        const errorCode = rule.validate(field.value);
        if (errorCode !== null) {
          errors.push(new ValidationError(field.fieldCode, errorCode));
        }
      }
    }
    return errors;
  }
}
