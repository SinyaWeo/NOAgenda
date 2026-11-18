import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Plugin } from './plugin.entity';

@Injectable()
export class PluginService {
  constructor(
    @InjectRepository(Plugin)
    private readonly pluginRepository: Repository<Plugin>,
  ) {}

  async findAll(): Promise<Plugin[]> {
    return this.pluginRepository.find();
  }

  async findById(id: number): Promise<Plugin | null> {
    return this.pluginRepository.findOne({ where: { id } });
  }

  async create(data: Partial<Plugin>): Promise<Plugin> {
    const plugin = this.pluginRepository.create(data);
    return this.pluginRepository.save(plugin);
  }

  async update(id: number, data: Partial<Plugin>): Promise<Plugin | null> {
    await this.pluginRepository.update(id, data as QueryDeepPartialEntity<Plugin>);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.pluginRepository.delete(id);
  }
}
