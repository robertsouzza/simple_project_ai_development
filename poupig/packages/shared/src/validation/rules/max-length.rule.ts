import { ValidationRule } from '../validation-rule';

export class MaxLengthRule implements ValidationRule {
  public readonly errorCode = 'max.length';

  constructor(private readonly max: number) {}

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return value.length <= this.max;
  }
}
