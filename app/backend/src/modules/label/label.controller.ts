import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { LabelService } from './label.service';
import { Label } from './label.entity';
import { CreateLabelDto, UpdateLabelDto } from './dto/label.dto';

@Controller('labels')
export class LabelController {
  constructor(private readonly labelService: LabelService) {}

  @Get()
  async findAll(@Request() req: any): Promise<Label[]> {
    return this.labelService.findAll(req.user.userId);
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: any): Promise<Label> {
    const label = await this.labelService.findById(id);
    if (!label) throw new NotFoundException();
    if (label.createdBy !== req.user.userId) {
      const mine = await this.labelService.findAll(req.user.userId);
      if (!mine.some((l) => l.id === Number(id))) throw new ForbiddenException();
    }
    return label;
  }

  @Post()
  async create(@Body() body: CreateLabelDto, @Request() req: any): Promise<Label> {
    const data = { ...body };
    return this.labelService.create({ ...data, createdBy: req.user.userId });
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: UpdateLabelDto, @Request() req: any): Promise<Label> {
    const label = await this.labelService.findById(id);
    if (!label) throw new NotFoundException();
    if (label.createdBy !== req.user.userId) throw new ForbiddenException();
    const updated = await this.labelService.update(id, { ...body });
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const label = await this.labelService.findById(id);
    if (!label) throw new NotFoundException();
    if (label.createdBy !== req.user.userId) throw new ForbiddenException();
    return this.labelService.remove(id);
  }
}
