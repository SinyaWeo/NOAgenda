import type { AuthRequest } from '../../common/auth-user';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request } from '@nestjs/common';
import { IdeaService, IdeaView } from './idea.service';
import { IdeaCreateDto, IdeaListQueryDto, IdeaShareDto, IdeaUpdateDto } from './dto/idea.dto';

@Controller('ideas')
export class IdeaController {
  constructor(private readonly ideas: IdeaService) {}

  @Get()
  list(@Request() req: AuthRequest, @Query() q: IdeaListQueryDto): Promise<IdeaView[]> {
    return this.ideas.list(req.user.userId, { projectId: q.projectId });
  }

  @Post()
  create(@Body() body: IdeaCreateDto, @Request() req: AuthRequest): Promise<IdeaView> {
    return this.ideas.create(req.user.userId, body);
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() body: IdeaUpdateDto, @Request() req: AuthRequest): Promise<IdeaView> {
    return this.ideas.update(req.user.userId, Number(id), body);
  }

  @Put(':id/teams')
  setTeams(@Param('id') id: number, @Body() body: IdeaShareDto, @Request() req: AuthRequest): Promise<IdeaView> {
    return this.ideas.setTeams(req.user.userId, Number(id), body.teamIds);
  }

  @Delete(':id')
  remove(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    return this.ideas.remove(req.user.userId, Number(id));
  }
}
