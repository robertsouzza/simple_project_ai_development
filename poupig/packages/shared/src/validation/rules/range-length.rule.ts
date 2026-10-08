import { ValidationRule } from '../validation-rule';

export class RangeLengthRule implements ValidationRule {
  public readonly errorCode = 'range.length';

  constructor(
    private readonly min: number,
    private readonly max: number
  ) {}

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return value.length >= this.min && value.length <= this.max;
  }
}
