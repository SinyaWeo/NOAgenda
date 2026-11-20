import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Param, ParseIntPipe, Request } from '@nestjs/common';
import { NodeAccessService } from '../node/node-access.service';
import { CompletionHistory, TaskCompletionService } from './task-completion.service';

@Controller('tasks')
export class TaskCompletionController {
  constructor(
    private readonly completions: TaskCompletionService,
    private readonly access: NodeAccessService,
  ) {}

  /** GET /tasks/:id/completions: how often this repeating task was completed. */
  @Get(':id/completions')
  async history(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest): Promise<CompletionHistory> {
    await this.access.assertRead(req.user.userId, id);
    return this.completions.history(id);
  }
}
