import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectUser } from './project-user.entity';
import { ProjectUserService } from './project-user.service';
import { ProjectUserController } from './project-user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectUser])],
  providers: [ProjectUserService],
  controllers: [ProjectUserController],
  exports: [ProjectUserService],
})
export class ProjectUserModule {}
