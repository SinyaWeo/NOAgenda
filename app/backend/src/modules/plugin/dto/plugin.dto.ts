import { ArrayMaxSize, IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

/** Admin: switch a plugin on/off and change its settings (a string sets a field, null or '' clears it). */
export class UpdatePluginDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, string | null>;
}

/** A user's own settings for a plugin. */
export class UpdateUserPluginDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** Notification types this channel carries for the user. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  types?: string[];

  @IsOptional()
  @IsObject()
  settings?: Record<string, string | null>;
}
