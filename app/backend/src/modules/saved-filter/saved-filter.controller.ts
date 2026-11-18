import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { CreateFilterDto, UpdateFilterDto } from './dto/saved-filter.dto';
import { SavedFilterService } from './saved-filter.service';
import { SavedFilter } from './saved-filter.entity';

@Controller('filters')
export class SavedFilterController {
  constructor(private readonly service: SavedFilterService) {}

  @Get()
  findAll(@Request() req: AuthRequest): Promise<SavedFilter[]> {
    return this.service.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: number, @Request() req: AuthRequest): Promise<SavedFilter> {
    return this.service.findOne(id, req.user.userId);
  }

  @Post()
  create(@Body() body: CreateFilterDto, @Request() req: AuthRequest): Promise<SavedFilter> {
    return this.service.create(req.user.userId, body);
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() body: UpdateFilterDto, @Request() req: AuthRequest): Promise<SavedFilter> {
    return this.service.update(id, req.user.userId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    return this.service.remove(id, req.user.userId);
  }
}
