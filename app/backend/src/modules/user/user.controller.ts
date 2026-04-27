import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { AuthGuard } from '@nestjs/passport';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
  async create(@Body() body: CreateUserDto): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.userService.create(body);
      return this.strip(user);
    } catch (err) {
      console.error('User registration error:', err);
      throw err;
    }
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
