import { DomainError } from './domain.error';

export class UnauthorizedError extends DomainError {
  public override readonly statusCode = 401;
}
