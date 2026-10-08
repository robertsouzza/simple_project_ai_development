import { DomainError } from '../error/domain.error';
import { ValidationError } from '../error/validation.error';

export class ValidationException extends DomainError {
  public override readonly statusCode = 422;

  constructor(public readonly errors: ValidationError[]) {
    super(`Validation failed with ${errors.length} error(s)`);
  }
}
