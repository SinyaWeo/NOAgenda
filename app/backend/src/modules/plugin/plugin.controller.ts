import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PluginService } from './plugin.service';
import { Plugin } from './plugin.entity';
import { AuthGuard } from '@nestjs/passport';
import { Request } from '@nestjs/common';
import { CreatePluginDto, UpdatePluginDto } from './dto/plugin.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../user/user-role.enum';

@Controller('plugins')
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  /** `config` may hold credentials/internals: only admins see it. */
  private view(plugin: Plugin, req: any): Plugin {
    if (req.user?.role === UserRole.ADMIN) return plugin;
    const { config: _hidden, ...rest } = plugin as any;
    return rest as Plugin;
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Request() req: any): Promise<Plugin[]> {
    return (await this.pluginService.findAll()).map((p) => this.view(p, req));
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: number, @Request() req: any): Promise<Plugin | null> {
    const plugin = await this.pluginService.findById(id);
    return plugin ? this.view(plugin, req) : null;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() body: CreatePluginDto): Promise<Plugin> {
    return this.pluginService.create({ ...body });
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: number, @Body() body: UpdatePluginDto): Promise<Plugin | null> {
    return this.pluginService.update(id, { ...body });
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: number): Promise<void> {
    return this.pluginService.remove(id);
  }
}
