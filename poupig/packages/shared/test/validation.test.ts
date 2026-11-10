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
      ['valor', null],
      ['', 'required'],
      ['   ', 'required'],
      [null, 'required'],
      [undefined, 'required'],
      [0, null],
      [false, null],
    ])('%p → %p', (value, expected) => {
      expect(rule.validate(value)).toBe(expected);
    });
  });

  describe('EmailRule', () => {
    const rule = new EmailRule();
    test.each([
      ['user@example.com', null],
      ['a.b+c@sub.dom.io', null],
      ['sem-arroba', 'invalid.email'],
      ['user@', 'invalid.email'],
      ['@example.com', 'invalid.email'],
      ['user@com', 'invalid.email'],
      [null, 'invalid.email'],
    ])('%p → %p', (value, expected) => {
      expect(rule.validate(value)).toBe(expected);
    });
  });

  describe('MinLengthRule', () => {
    const rule = new MinLengthRule(3);
    test.each([
      ['abc', null],
      ['abcd', null],
      ['ab', 'min.length'],
      ['', 'min.length'],
      [null, 'min.length'],
    ])('%p → %p', (value, expected) => {
      expect(rule.validate(value)).toBe(expected);
    });
  });

  describe('MaxLengthRule', () => {
    const rule = new MaxLengthRule(3);
    test.each([
      ['abc', null],
      ['ab', null],
      ['abcd', 'max.length'],
      [null, 'max.length'],
    ])('%p → %p', (value, expected) => {
      expect(rule.validate(value)).toBe(expected);
    });
  });

  describe('RangeLengthRule', () => {
    const rule = new RangeLengthRule(2, 4);
    test.each([
      ['ab', null],
      ['abc', null],
      ['abcd', null],
      ['a', 'range.length'],
      ['abcde', 'range.length'],
    ])('%p → %p', (value, expected) => {
      expect(rule.validate(value)).toBe(expected);
    });
  });

  describe('DateRule', () => {
    const rule = new DateRule();
    test('Date válida → null', () => {
      expect(rule.validate(new Date())).toBeNull();
    });
    test('Date inválida → invalid.date', () => {
      expect(rule.validate(new Date('abacaxi'))).toBe('invalid.date');
    });
    test('string ISO → null', () => {
      expect(rule.validate('2026-01-15')).toBeNull();
    });
    test('string lixo → invalid.date', () => {
      expect(rule.validate('not-a-date')).toBe('invalid.date');
    });
    test('tipo incompatível → invalid.date', () => {
      expect(rule.validate({})).toBe('invalid.date');
    });
  });

  describe('AgeRule', () => {
    const rule = new AgeRule(18, 65);
    test.each([
      [18, null],
      [65, null],
      [30, null],
      [17, 'invalid.age'],
      [66, 'invalid.age'],
      ['30', 'invalid.age'],
      [NaN, 'invalid.age'],
    ])('%p → %p', (value, expected) => {
      expect(rule.validate(value)).toBe(expected);
    });
  });
});

describe('Validator', () => {
  test('retorna [] quando todos os campos passam', () => {
    const errors = new Validator().validate([
      {
        fieldCode: 'user.email',
        value: 'robert@example.com',
        rules: [new RequiredRule(), new EmailRule()],
      },
      {
        fieldCode: 'user.name',
        value: 'Roberto',
        rules: [new RequiredRule(), new MinLengthRule(3)],
      },
    ]);
    expect(errors).toEqual([]);
  });

  test('agrega erros de múltiplos campos de uma só entidade', () => {
    const errors = new Validator().validate([
      {
        fieldCode: 'user.email',
        value: 'nao-eh-email',
        rules: [new RequiredRule(), new EmailRule()],
      },
      {
        fieldCode: 'user.name',
        value: '',
        rules: [new RequiredRule(), new MinLengthRule(3)],
      },
      {
        fieldCode: 'user.age',
        value: 15,
        rules: [new AgeRule(18, 99)],
      },
    ]);
    expect(errors.map((e) => e.fullCode)).toEqual([
      'user.email.invalid.email',
      'user.name.required',
      'user.name.min.length',
      'user.age.invalid.age',
    ]);
  });

  test('não para no primeiro erro dentro de um único campo', () => {
    const errors = new Validator().validate([
      {
        fieldCode: 'user.name',
        value: '',
        rules: [new RequiredRule(), new MinLengthRule(3), new MaxLengthRule(10)],
      },
    ]);
    expect(errors.map((e) => e.errorCode)).toEqual(['required', 'min.length']);
    expect(errors.every((e) => e.fieldCode === 'user.name')).toBe(true);
  });

  test('lista vazia de campos → sem erros', () => {
    expect(new Validator().validate([])).toEqual([]);
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
