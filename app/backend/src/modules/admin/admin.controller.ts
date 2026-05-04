import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from '../user/user.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../user/user-role.enum';
import { User } from '../user/user.entity';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly userService: UserService) {}

  @Get('users')
  async findAllUsers(): Promise<Omit<User, 'password'>[]> {
    return this.userService.findAllAdmin();
  }

  @Patch('users/:id/role')
  async updateRole(
    @Param('id') id: number,
    @Body('role') role: UserRole,
    @Request() req: any,
  ): Promise<Omit<User, 'password'>> {
    if (!Object.values(UserRole).includes(role)) {
      throw new ForbiddenException('Invalid role');
    }
    if (req.user.userId === Number(id)) {
      throw new ForbiddenException('Cannot change your own role');
    }
    const user = await this.userService.setRole(Number(id), role);
    if (!user) throw new NotFoundException();
    const { password: _p, ...safe } = user as any;
    return safe;
  }
}
