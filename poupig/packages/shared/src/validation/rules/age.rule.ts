import { ValidationRule } from '../validation-rule.interface';

export class AgeRule implements ValidationRule {
  constructor(
    private readonly min: number,
    private readonly max: number
  ) {}

  validate(value: unknown): string | null {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'invalid.age';
    if (value < this.min || value > this.max) return 'invalid.age';
    return null;
  }
}
