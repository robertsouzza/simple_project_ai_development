import { getModuleName } from '../src/index';

test('deve retornar o nome do módulo configurado', () => {
  expect(getModuleName()).toBe('__MODULE_NAME__');
});
