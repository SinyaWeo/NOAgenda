import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { PluginService } from './plugin.service';
import { Plugin } from './plugin.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('plugins')
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  /** Only allow the configured admin user ID to mutate plugins. */
  private assertAdmin(req: any): void {
    const adminId = process.env.ADMIN_USER_ID ? Number(process.env.ADMIN_USER_ID) : null;
    if (adminId === null || req.user.userId !== adminId) {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(): Promise<Plugin[]> {
    return this.pluginService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: number): Promise<Plugin | null> {
    return this.pluginService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Plugin>, @Request() req: any): Promise<Plugin> {
    this.assertAdmin(req);
    const { id: _id, ...safeBody } = body as any;
    return this.pluginService.create(safeBody);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Plugin>, @Request() req: any): Promise<Plugin | null> {
    this.assertAdmin(req);
    const { id: _id, ...safeBody } = body as any;
    return this.pluginService.update(id, safeBody);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    this.assertAdmin(req);
    return this.pluginService.remove(id);
  }
}
