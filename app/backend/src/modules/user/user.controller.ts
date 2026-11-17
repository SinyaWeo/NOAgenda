import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { Throttle } from '@nestjs/throttler';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { assertMayRegister, adminAllowsRegistration } from './registration';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly emailVerification: EmailVerificationService,
    private readonly appSettings: AppSettingsService,
  ) {}

  private strip(user: User): Omit<User, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = user as any;
    return safe;
  }

  /**
   * Find people to add to a project or team. There is deliberately no "list everyone":
   * a search needs at least 3 characters, returns at most 10 matches and only public
   * fields (never the email), and is rate-limited, so the directory cannot be harvested.
   */
  @Get()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async search(
    @Query('q') q: unknown,
    @Request() req: any,
  ): Promise<Pick<User, 'id' | 'username' | 'name' | 'avatarUrl'>[]> {
    if (typeof q !== 'string' || q.trim().length < 3) {
      throw new BadRequestException('q is required (at least 3 characters)');
    }
    return this.userService.search(q.trim().slice(0, 50), req.user.userId);
  }

  // Must be registered before :id to avoid route conflict
  @Get('me')
  async getMe(@Request() req: any): Promise<Omit<User, 'password'>> {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    return this.strip(user);
  }

  @Public() // registration
  @Post()
  @Throttle({ default: { ttl: 3600000, limit: 10 } }) // 10 registrations / hour / IP
  async create(@Body() body: CreateUserDto): Promise<Omit<User, 'password'>> {
    assertMayRegister(
      body.inviteCode,
      process.env,
      adminAllowsRegistration(await this.appSettings.get('allowRegistration')),
    );
    const { acceptTerms, inviteCode: _inviteCode, ...data } = body;
    if (process.env.REQUIRE_TERMS_ACCEPTANCE === 'true' && acceptTerms !== true) {
      throw new BadRequestException('You must accept the Terms of Service and Privacy Policy to register');
    }
    const user = await this.userService.create({ ...data, ...(acceptTerms ? { termsAcceptedAt: new Date() } : {}) });
    // Not awaited: registration must not fail or stall on mail delivery.
    void this.emailVerification.send(user).catch(() => undefined);
    return this.strip(user);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() body: UpdateUserDto,
    @Request() req: any,
  ): Promise<Omit<User, 'password'>> {
    if (req.user.userId !== Number(id)) throw new ForbiddenException();
    const user = await this.userService.update(id, body);
    if (!user) throw new NotFoundException();
    return this.strip(user);
  }
}
