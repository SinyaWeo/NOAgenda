import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { LabelService } from './label.service';
import { Label } from './label.entity';
import { AuthGuard } from '@nestjs/passport';

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
  async create(@Body() body: Partial<Label>, @Request() req: any): Promise<Label> {
    const { id: _i, createdAt: _c, updatedAt: _u, createdBy: _o, ...data } = body as any;
    return this.labelService.create({ ...data, createdBy: req.user.userId });
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Label>, @Request() req: any): Promise<Label> {
    const label = await this.labelService.findById(id);
    if (!label) throw new NotFoundException();
    if (label.createdBy !== req.user.userId) throw new ForbiddenException();
    // Prevent mass-assignment of ownership/identity fields
    const { id: _id, createdBy: _cb, ...safeBody } = body as any;
    const updated = await this.labelService.update(id, safeBody);
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
