import { ValidationRule } from '../validation-rule.interface';

export class RangeLengthRule implements ValidationRule {
  constructor(
    private readonly min: number,
    private readonly max: number
  ) {}

  validate(value: unknown): string | null {
    if (
      typeof value !== 'string' ||
      value.length < this.min ||
      value.length > this.max
    ) {
      return 'range.length';
    }
    return null;
  }
}
