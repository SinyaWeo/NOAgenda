import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodeModule } from '../node/node.module';
import { NodeRevision } from './node-revision.entity';
import { NodeRevisionService } from './node-revision.service';
import { NodeRevisionController } from './node-revision.controller';

@Module({
  imports: [NodeModule, TypeOrmModule.forFeature([NodeRevision])],
  providers: [NodeRevisionService],
  controllers: [NodeRevisionController],
})
export class NodeRevisionModule {}
