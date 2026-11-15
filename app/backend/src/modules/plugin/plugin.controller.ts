import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PluginService } from './plugin.service';
import { Plugin } from './plugin.entity';
import { AuthGuard } from '@nestjs/passport';
import { CreatePluginDto, UpdatePluginDto } from './dto/plugin.dto';
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
