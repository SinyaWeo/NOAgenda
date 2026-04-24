import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
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
  async findById(@Param('id') id: number): Promise<Label | null> {
    return this.labelService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Label>): Promise<Label> {
    return this.labelService.create(body);
  }
}
