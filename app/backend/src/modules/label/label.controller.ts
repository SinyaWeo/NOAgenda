import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { LabelService } from './label.service';
import { Label } from './label.entity';
import { AuthGuard } from '@nestjs/passport';
import { CreateLabelDto, UpdateLabelDto } from './dto/label.dto';

@Controller('labels')
export class LabelController {
  constructor(private readonly labelService: LabelService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Request() req: any): Promise<Label[]> {
    return this.labelService.findAll(req.user.userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
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
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: CreateLabelDto, @Request() req: any): Promise<Label> {
    const data = { ...body };
    return this.labelService.create({ ...data, createdBy: req.user.userId });
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: UpdateLabelDto, @Request() req: any): Promise<Label> {
    const label = await this.labelService.findById(id);
    if (!label) throw new NotFoundException();
    if (label.createdBy !== req.user.userId) throw new ForbiddenException();
    const updated = await this.labelService.update(id, { ...body });
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const label = await this.labelService.findById(id);
    if (!label) throw new NotFoundException();
    if (label.createdBy !== req.user.userId) throw new ForbiddenException();
    return this.labelService.remove(id);
  }
}
