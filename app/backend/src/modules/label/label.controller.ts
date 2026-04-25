import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { LabelService } from './label.service';
import { Label } from './label.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('labels')
export class LabelController {
  constructor(private readonly labelService: LabelService) {}

  @Get()
  async findAll(): Promise<Label[]> {
    return this.labelService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Label> {
    const label = await this.labelService.findById(id);
    if (!label) throw new NotFoundException();
    return label;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Label>): Promise<Label> {
    return this.labelService.create(body);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Label>): Promise<Label> {
    const label = await this.labelService.update(id, body);
    if (!label) throw new NotFoundException();
    return label;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number): Promise<void> {
    return this.labelService.remove(id);
  }
}
