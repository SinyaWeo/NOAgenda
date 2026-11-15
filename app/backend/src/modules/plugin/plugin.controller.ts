import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PluginService } from './plugin.service';
import { Plugin } from './plugin.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../user/user-role.enum';

@Controller('plugins')
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() body: Partial<Plugin>): Promise<Plugin> {
    const { id: _id, ...safeBody } = body as any;
    return this.pluginService.create(safeBody);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: number, @Body() body: Partial<Plugin>): Promise<Plugin | null> {
    const { id: _id, ...safeBody } = body as any;
    return this.pluginService.update(id, safeBody);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: number): Promise<void> {
    return this.pluginService.remove(id);
  }
}
