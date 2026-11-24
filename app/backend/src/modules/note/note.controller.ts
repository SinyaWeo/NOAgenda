import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Request } from '@nestjs/common';
import { NoteService } from './note.service';
import { Note } from './note.entity';
import { NoteConvertDto, NoteCreateDto, NoteTarget, NoteUpdateDto } from './dto/note.dto';

@Controller('notes')
export class NoteController {
  constructor(private readonly service: NoteService) {}

  @Get()
  findAll(@Request() req: AuthRequest): Promise<Note[]> {
    return this.service.findAll(req.user.userId);
  }

  @Post()
  create(@Body() body: NoteCreateDto, @Request() req: AuthRequest): Promise<Note> {
    return this.service.create(req.user.userId, body);
  }

  // Declared before ':id' so "completed" is not read as an id.
  @Delete('completed')
  removeCompleted(@Request() req: AuthRequest): Promise<void> {
    return this.service.removeCompleted(req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: NoteUpdateDto,
    @Request() req: AuthRequest,
  ): Promise<Note> {
    return this.service.update(id, req.user.userId, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest): Promise<void> {
    return this.service.remove(id, req.user.userId);
  }

  @Post(':id/convert')
  convert(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: NoteConvertDto,
    @Request() req: AuthRequest,
  ): Promise<{ type: NoteTarget; id: number }> {
    return this.service.convert(id, req.user.userId, body);
  }
}
