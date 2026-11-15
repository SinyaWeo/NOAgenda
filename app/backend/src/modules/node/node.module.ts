import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Node } from './node.entity';
import { NodeService } from './node.service';
import { NodeAccessService } from './node-access.service';
import { NodeController } from './node.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Node])],
  providers: [NodeService, NodeAccessService],
  controllers: [NodeController],
  exports: [NodeService, NodeAccessService],
})
export class NodeModule {}
