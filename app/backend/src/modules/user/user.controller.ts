import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: number): Promise<User | null> {
    return this.userService.findById(id);
  }

  @Post()
  async create(@Body() body: Partial<User>): Promise<User> {
    try {
      return await this.userService.create(body);
    } catch (err) {
      console.error('User registration error:', err);
      throw err;
    }
  }
}
