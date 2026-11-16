import { IsBoolean, IsInt, IsObject, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

const URL_OPTS = { protocols: ['http', 'https'], require_protocol: true, require_tld: false };

export class CreateWebhookDto {
  @IsUrl(URL_OPTS, { message: 'url must be a valid http(s) URL' })
  @MaxLength(2048)
  url!: string;

  /** Event name to subscribe to; "*" (the default) means all events. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  event?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  secret?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(1)
  projectId?: number;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl(URL_OPTS, { message: 'url must be a valid http(s) URL' })
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  event?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  secret?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
