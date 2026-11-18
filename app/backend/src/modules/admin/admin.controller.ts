import { omit } from '../../common/omit';
import type { AuthRequest } from '../../common/auth-user';
import {
  Controller,
  Get,
  Patch,
  Delete,
  HttpCode,
  BadRequestException,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../user/user-role.enum';
import { User } from '../user/user.entity';
import { AccountService } from '../account/account.service';
import { SessionService } from '../session/session.service';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly userService: UserService,
    private readonly accounts: AccountService,
    private readonly sessions: SessionService,
  ) {}

  @Get('users')
  async findAllUsers(): Promise<Omit<User, 'password'>[]> {
    return this.userService.findAllAdmin();
  }

  @Patch('users/:id/role')
  async updateRole(
    @Param('id') id: number,
    @Body('role') role: UserRole,
    @Request() req: AuthRequest,
  ): Promise<Omit<User, 'password'>> {
    if (!Object.values(UserRole).includes(role)) {
      throw new ForbiddenException('Invalid role');
    }
    if (req.user.userId === Number(id)) {
      throw new ForbiddenException('Cannot change your own role');
    }
    const user = await this.userService.setRole(Number(id), role);
    if (!user) throw new NotFoundException();
    return omit(user, 'password');
  }

  @Patch('users/:id/lock')
  async setLocked(
    @Param('id') id: number,
    @Body('locked') locked: boolean,
    @Request() req: AuthRequest,
  ): Promise<Omit<User, 'password'>> {
    if (typeof locked !== 'boolean') throw new BadRequestException('locked must be a boolean');
    const userId = Number(id);
    if (req.user.userId === userId) throw new ForbiddenException('Cannot lock your own account');
    const user = await this.userService.setLocked(userId, locked);
    if (!user) throw new NotFoundException();
    // End every live session right away; API tokens and JWTs are also refused while locked.
    if (locked) await this.sessions.revokeAllForUser(userId);
    return omit(user, 'password');
  }

  @Delete('users/:id')
  @HttpCode(204)
  async removeUser(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    const userId = Number(id);
    if (req.user.userId === userId) throw new ForbiddenException('Cannot delete your own account');
    if (!(await this.userService.findById(userId))) throw new NotFoundException();
    await this.accounts.purgeUser(userId);
  }
}
