import { PluginService } from './plugin.service';
import { Plugin } from './plugin.entity';
export declare class PluginController {
    private readonly pluginService;
    constructor(pluginService: PluginService);
    findAll(): Promise<Plugin[]>;
    findById(id: number): Promise<Plugin | null>;
    create(body: Partial<Plugin>): Promise<Plugin>;
    update(id: number, body: Partial<Plugin>): Promise<Plugin | null>;
    remove(id: number): Promise<void>;
}
