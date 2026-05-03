import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Node } from './node.entity';
import { NodeService } from './node.service';
import { NodeController } from './node.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Node])],
  providers: [NodeService],
  controllers: [NodeController],
  exports: [NodeService],
})
export class NodeModule {}
