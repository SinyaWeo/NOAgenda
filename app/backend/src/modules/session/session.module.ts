import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSession } from './session.entity';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserSession])],
  providers: [SessionService],
  controllers: [SessionController],
  exports: [SessionService],
})
export class SessionModule {}
