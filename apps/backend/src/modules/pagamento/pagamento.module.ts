import { Module } from '@nestjs/common';
import { PagamentoController } from './pagamento.controller';

@Module({
  controllers: [PagamentoController],
})
export class PagamentoModule {}
