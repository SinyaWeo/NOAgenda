import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiToken } from './api-token.entity';
import { ApiTokenService } from './api-token.service';
import { ApiTokenController } from './api-token.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApiToken])],
  providers: [ApiTokenService],
  controllers: [ApiTokenController],
})
export class ApiTokenModule {}
