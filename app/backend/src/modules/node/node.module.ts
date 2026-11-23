import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Node } from './node.entity';
import { NodeService } from './node.service';
import { NodeAccessService } from './node-access.service';
import { NodeController } from './node.controller';
import { NodeTrashService } from './node-trash.service';
import { NodeTrashController } from './node-trash.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Node])],
  providers: [NodeService, NodeAccessService, NodeTrashService],
  controllers: [NodeController, NodeTrashController],
  exports: [NodeService, NodeAccessService],
})
export class NodeModule {}
