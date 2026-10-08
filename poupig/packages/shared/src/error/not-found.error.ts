import { DomainError } from './domain.error';

export class NotFoundError extends DomainError {
  public override readonly statusCode = 404;
}
