import { ValidationRule } from '../validation-rule';

export class AgeRule implements ValidationRule {
  public readonly errorCode = 'invalid.age';

  constructor(
    private readonly min: number,
    private readonly max: number
  ) {}

  validate(value: unknown): boolean {
    if (typeof value !== 'number' || Number.isNaN(value)) return false;
    return value >= this.min && value <= this.max;
  }
}
