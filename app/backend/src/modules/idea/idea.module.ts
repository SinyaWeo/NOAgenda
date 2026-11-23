import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Node } from '../node/node.entity';
import { NodeModule } from '../node/node.module';
import { IdeaTeam } from './idea-team.entity';
import { IdeaService } from './idea.service';
import { IdeaController } from './idea.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Node, IdeaTeam]), NodeModule],
  providers: [IdeaService],
  controllers: [IdeaController],
})
export class IdeaModule {}
