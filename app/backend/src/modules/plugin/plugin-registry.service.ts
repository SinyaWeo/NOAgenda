import { Injectable } from '@nestjs/common';
import type { PluginDefinition } from './plugin.types';

const KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** The built-in plugins of this build. Each plugin module registers itself when it is created. */
@Injectable()
export class PluginRegistry {
  private readonly defs = new Map<string, PluginDefinition>();

  register(def: PluginDefinition): void {
    if (!KEY.test(def.key)) throw new Error(`Invalid plugin key "${def.key}"`);
    if (this.defs.has(def.key)) throw new Error(`Plugin "${def.key}" is registered twice`);
    const keys = [...def.adminFields, ...def.userFields].map((f) => f.key);
    if (new Set(def.adminFields.map((f) => f.key)).size !== def.adminFields.length) {
      throw new Error(`Plugin "${def.key}" declares an admin field twice`);
    }
    if (new Set(def.userFields.map((f) => f.key)).size !== def.userFields.length) {
      throw new Error(`Plugin "${def.key}" declares a user field twice`);
    }
    if (keys.some((k) => !/^[a-zA-Z][a-zA-Z0-9]*$/.test(k)))
      throw new Error(`Plugin "${def.key}" has an invalid field key`);
    this.defs.set(def.key, def);
  }

  get(key: string): PluginDefinition | undefined {
    return this.defs.get(key);
  }

  all(): PluginDefinition[] {
    return [...this.defs.values()];
  }
}
