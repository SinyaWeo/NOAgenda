import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { SessionModule } from '../session/session.module';
import { MfaService } from './mfa.service';
import { MfaController } from './mfa.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), SessionModule],
  providers: [MfaService],
  controllers: [MfaController],
  exports: [MfaService],
})
export class MfaModule {}
