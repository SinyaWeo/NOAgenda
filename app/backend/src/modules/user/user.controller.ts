import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailVerificationService } from '../email-verification/email-verification.service';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  private strip(user: User): Omit<User, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = user as any;
    return safe;
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(): Promise<Omit<User, 'password'>[]> {
    return this.userService.findAll();
  }

  // Must be registered before :id to avoid route conflict
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Request() req: any): Promise<Omit<User, 'password'>> {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    return this.strip(user);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: number): Promise<Omit<User, 'password'>> {
    const user = await this.userService.findByIdSafe(id);
    if (!user) throw new NotFoundException();
    return user;
  }

  @Post()
  @Throttle({ default: { ttl: 3600000, limit: 10 } }) // 10 registrations / hour / IP
  async create(@Body() body: CreateUserDto): Promise<Omit<User, 'password'>> {
    const user = await this.userService.create(body);
    // Not awaited: registration must not fail or stall on mail delivery.
    void this.emailVerification.send(user).catch(() => undefined);
    return this.strip(user);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: UpdateUserDto, @Request() req: any): Promise<Omit<User, 'password'>> {
    if (req.user.userId !== Number(id)) throw new ForbiddenException();
    const user = await this.userService.update(id, body);
    if (!user) throw new NotFoundException();
    return this.strip(user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    if (req.user.userId !== Number(id)) throw new ForbiddenException();
    return this.userService.remove(id);
  }
}
