import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SavedFilterService } from './saved-filter.service';
import { SavedFilter } from './saved-filter.entity';

@Controller('filters')
@UseGuards(AuthGuard('jwt'))
export class SavedFilterController {
  constructor(private readonly service: SavedFilterService) {}

  @Get()
  findAll(@Request() req: any): Promise<SavedFilter[]> {
    return this.service.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: number, @Request() req: any): Promise<SavedFilter> {
    return this.service.findOne(id, req.user.userId);
  }

  @Post()
  create(@Body() body: Partial<SavedFilter>, @Request() req: any): Promise<SavedFilter> {
    return this.service.create(req.user.userId, body);
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() body: Partial<SavedFilter>, @Request() req: any): Promise<SavedFilter> {
    return this.service.update(id, req.user.userId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    return this.service.remove(id, req.user.userId);
  }
}
