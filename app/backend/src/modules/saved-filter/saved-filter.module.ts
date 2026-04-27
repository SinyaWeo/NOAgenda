import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedFilter } from './saved-filter.entity';
import { SavedFilterService } from './saved-filter.service';
import { SavedFilterController } from './saved-filter.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SavedFilter])],
  providers: [SavedFilterService],
  controllers: [SavedFilterController],
})
export class SavedFilterModule {}
