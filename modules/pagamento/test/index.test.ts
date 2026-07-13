import { getModuleName } from '../src/index';

test('deve retornar o nome do módulo configurado', () => {
  expect(getModuleName()).toBe('pagamento');
});
