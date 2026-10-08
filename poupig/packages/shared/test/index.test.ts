import { describe, test, expect } from '@jest/globals';
import {
  DomainError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from '../src/index';

describe('errors', () => {
  test('DomainError herda de Error e tem statusCode 500 por padrão', () => {
    const err = new DomainError('base');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('base');
    expect(err.name).toBe('DomainError');
    expect(err.statusCode).toBe(500);
  });

  test('ValidationError tem statusCode 422 e herda de DomainError', () => {
    const err = new ValidationError('invalid');
    expect(err).toBeInstanceOf(DomainError);
    expect(err.name).toBe('ValidationError');
    expect(err.statusCode).toBe(422);
  });

  test('NotFoundError tem statusCode 404 e herda de DomainError', () => {
    const err = new NotFoundError('missing');
    expect(err).toBeInstanceOf(DomainError);
    expect(err.name).toBe('NotFoundError');
    expect(err.statusCode).toBe(404);
  });

  test('UnauthorizedError tem statusCode 401 e herda de DomainError', () => {
    const err = new UnauthorizedError('no token');
    expect(err).toBeInstanceOf(DomainError);
    expect(err.name).toBe('UnauthorizedError');
    expect(err.statusCode).toBe(401);
  });
});
