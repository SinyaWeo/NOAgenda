import { MultiUserOnly } from '../../common/decorators/multi-user-only.decorator';
import type { AuthRequest } from '../../common/auth-user';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Request } from '@nestjs/common';
import { RevisionPage } from '../node-revision/node-revision.service';
import { IdeaService, IdeaTrashEntry, IdeaView } from './idea.service';
import { IdeaCreateDto, IdeaHistoryQueryDto, IdeaListQueryDto, IdeaShareDto, IdeaUpdateDto } from './dto/idea.dto';

@Controller('ideas')
export class IdeaController {
  constructor(private readonly ideas: IdeaService) {}

  @Get()
  list(@Request() req: AuthRequest, @Query() q: IdeaListQueryDto): Promise<IdeaView[]> {
    return this.ideas.list(req.user.userId, { projectId: q.projectId });
  }

  @Get('trash')
  trash(@Request() req: AuthRequest): Promise<IdeaTrashEntry[]> {
    return this.ideas.listTrashed(req.user.userId);
  }

  @Post()
  create(@Body() body: IdeaCreateDto, @Request() req: AuthRequest): Promise<IdeaView> {
    return this.ideas.create(req.user.userId, body);
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() body: IdeaUpdateDto, @Request() req: AuthRequest): Promise<IdeaView> {
    return this.ideas.update(req.user.userId, Number(id), body);
  }

  @MultiUserOnly()
  @Put(':id/teams')
  setTeams(@Param('id') id: number, @Body() body: IdeaShareDto, @Request() req: AuthRequest): Promise<IdeaView> {
    return this.ideas.setTeams(req.user.userId, Number(id), body.teamIds);
  }

  @Delete(':id')
  remove(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    return this.ideas.remove(req.user.userId, Number(id));
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest): Promise<IdeaView> {
    return this.ideas.restore(req.user.userId, id);
  }

  /** Delete an idea that is in the trash for good. */
  @Delete(':id/trash')
  purge(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest): Promise<void> {
    return this.ideas.purge(req.user.userId, id);
  }

  @Get(':id/history')
  history(
    @Param('id', ParseIntPipe) id: number,
    @Query() q: IdeaHistoryQueryDto,
    @Request() req: AuthRequest,
  ): Promise<RevisionPage> {
    return this.ideas.history(req.user.userId, id, q.before, q.limit);
  }

  @Post(':id/history/:revisionId/restore')
  restoreRevision(
    @Param('id', ParseIntPipe) id: number,
    @Param('revisionId', ParseIntPipe) revisionId: number,
    @Request() req: AuthRequest,
  ): Promise<IdeaView> {
    return this.ideas.restoreRevision(req.user.userId, id, revisionId);
  }
}
