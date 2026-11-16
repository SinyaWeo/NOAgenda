import { Controller, Get, Query, Request } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query('q') q: unknown, @Request() req: any) {
    if (typeof q !== 'string' || q.trim().length < 2) return { tasks: [], projects: [] };
    return this.searchService.search(req.user.userId, q.trim().slice(0, 100));
  }
}
