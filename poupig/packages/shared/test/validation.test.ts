import { describe, test, expect } from '@jest/globals';
import {
  Validator,
  ValidationException,
  RequiredRule,
  EmailRule,
  MinLengthRule,
  MaxLengthRule,
  RangeLengthRule,
  DateRule,
  AgeRule,
  ValidationError,
  DomainError,
} from '../src/index';

describe('rules', () => {
  describe('RequiredRule', () => {
    const rule = new RequiredRule();
    test.each([
      ['valor', true],
      ['', false],
      ['   ', false],
      [null, false],
      [undefined, false],
      [0, true],
      [false, true],
    ])('%p → %p', (value, expected) => {
      expect(rule.validate(value)).toBe(expected);
    });
    test('errorCode é "required"', () => {
      expect(rule.errorCode).toBe('required');
    });
  });

  describe('EmailRule', () => {
    const rule = new EmailRule();
    test.each([
      ['user@example.com', true],
      ['a.b+c@sub.dom.io', true],
      ['sem-arroba', false],
      ['user@', false],
      ['@example.com', false],
      ['user@com', false],
      [null, false],
    ])('%p → %p', (value, expected) => {
      expect(rule.validate(value)).toBe(expected);
    });
    test('errorCode é "invalid.email"', () => {
      expect(rule.errorCode).toBe('invalid.email');
    });
  });

  describe('MinLengthRule', () => {
    const rule = new MinLengthRule(3);
    test.each([
      ['abc', true],
      ['abcd', true],
      ['ab', false],
      ['', false],
      [null, false],
    ])('%p → %p', (value, expected) => {
      expect(rule.validate(value)).toBe(expected);
    });
  });

  describe('MaxLengthRule', () => {
    const rule = new MaxLengthRule(3);
    test.each([
      ['abc', true],
      ['ab', true],
      ['abcd', false],
      [null, false],
    ])('%p → %p', (value, expected) => {
      expect(rule.validate(value)).toBe(expected);
    });
  });

  describe('RangeLengthRule', () => {
    const rule = new RangeLengthRule(2, 4);
    test.each([
      ['ab', true],
      ['abc', true],
      ['abcd', true],
      ['a', false],
      ['abcde', false],
    ])('%p → %p', (value, expected) => {
      expect(rule.validate(value)).toBe(expected);
    });
  });

  describe('DateRule', () => {
    const rule = new DateRule();
    test('Date válida passa', () => {
      expect(rule.validate(new Date())).toBe(true);
    });
    test('Date inválida falha', () => {
      expect(rule.validate(new Date('abacaxi'))).toBe(false);
    });
    test('string ISO passa', () => {
      expect(rule.validate('2026-01-15')).toBe(true);
    });
    test('string lixo falha', () => {
      expect(rule.validate('not-a-date')).toBe(false);
    });
    test('tipo incompatível falha', () => {
      expect(rule.validate({})).toBe(false);
    });
  });

  describe('AgeRule', () => {
    const rule = new AgeRule(18, 65);
    test.each([
      [18, true],
      [65, true],
      [30, true],
      [17, false],
      [66, false],
      ['30', false],
      [NaN, false],
    ])('%p → %p', (value, expected) => {
      expect(rule.validate(value)).toBe(expected);
    });
  });
});

describe('Validator', () => {
  test('retorna [] quando todas as regras passam', () => {
    const v = new Validator('user.name', [
      new RequiredRule(),
      new MinLengthRule(3),
    ]);
    expect(v.validate('Roberto')).toEqual([]);
  });

  test('agrega todos os erros, não para no primeiro', () => {
    const v = new Validator('user.name', [
      new RequiredRule(),
      new MinLengthRule(3),
      new MaxLengthRule(10),
    ]);
    const errors = v.validate('');
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.errorCode)).toEqual(['required', 'min.length']);
    expect(errors.every((e) => e.fieldCode === 'user.name')).toBe(true);
  });

  test('fullCode compõe fieldCode + errorCode', () => {
    const v = new Validator('user.email', [new EmailRule()]);
    const [err] = v.validate('invalido');
    expect(err?.fullCode).toBe('user.email.invalid.email');
  });
});

describe('ValidationException', () => {
  test('agrega lista de ValidationError e herda de DomainError', () => {
    const errors = [
      new ValidationError('user.email', 'invalid.email'),
      new ValidationError('user.name', 'required'),
    ];
    const exc = new ValidationException(errors);
    expect(exc).toBeInstanceOf(DomainError);
    expect(exc.statusCode).toBe(422);
    expect(exc.errors).toBe(errors);
    expect(exc.errors).toHaveLength(2);
  });
});
