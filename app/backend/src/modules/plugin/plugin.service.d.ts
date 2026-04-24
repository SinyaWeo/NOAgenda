import { Repository } from 'typeorm';
import { Plugin } from './plugin.entity';
export declare class PluginService {
    private readonly pluginRepository;
    constructor(pluginRepository: Repository<Plugin>);
    findAll(): Promise<Plugin[]>;
    findById(id: number): Promise<Plugin | null>;
    create(data: Partial<Plugin>): Promise<Plugin>;
    update(id: number, data: Partial<Plugin>): Promise<Plugin | null>;
    remove(id: number): Promise<void>;
}
