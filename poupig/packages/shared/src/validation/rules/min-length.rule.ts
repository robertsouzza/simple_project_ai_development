import { ValidationRule } from '../validation-rule';

export class MinLengthRule implements ValidationRule {
  public readonly errorCode = 'min.length';

  constructor(private readonly min: number) {}

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return value.length >= this.min;
  }
}
