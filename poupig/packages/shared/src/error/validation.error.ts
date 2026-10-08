import { DomainError } from './domain.error';

export class ValidationError extends DomainError {
  public override readonly statusCode = 422;

  constructor(
    public readonly fieldCode: string,
    public readonly errorCode: string
  ) {
    super(`${fieldCode}.${errorCode}`);
  }

  get fullCode(): string {
    return `${this.fieldCode}.${this.errorCode}`;
  }
}
