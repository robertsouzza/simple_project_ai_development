import { DomainError } from './domain.error';

export class ValidationError extends DomainError {
  public override readonly statusCode = 422;
}
