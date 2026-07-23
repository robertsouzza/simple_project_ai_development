import { Controller, Get } from '@nestjs/common';

@Controller('pagamento')
export class PagamentoController {
  @Get('/')
  getPagamento() {
    return { message: 'Pagamento endpoint' };
  }
}
