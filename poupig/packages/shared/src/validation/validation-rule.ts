export interface ValidationRule<T = unknown> {
  readonly errorCode: string;
  validate(value: T): boolean;
}
