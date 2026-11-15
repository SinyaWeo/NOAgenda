import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reaction } from './reaction.entity';
import { ReactionService } from './reaction.service';
import { ReactionController } from './reaction.controller';

import { NodeModule } from '../node/node.module';

@Module({
  imports: [NodeModule, TypeOrmModule.forFeature([Reaction])],
  providers: [ReactionService],
  controllers: [ReactionController],
})
export class ReactionModule {}
