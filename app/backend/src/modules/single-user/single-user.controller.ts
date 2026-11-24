import type { AuthRequest } from '../../common/auth-user';
import { Body, Controller, Get, HttpCode, Post, Query, Request, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { NotInDemoGuard } from '../../common/guards/not-in-demo.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../user/user-role.enum';
import { EnableSingleUserDto, SingleUserPreviewQueryDto } from './dto/single-user.dto';
import { SingleUserPreview, SingleUserService, SingleUserStatus } from './single-user.service';

/** The admin's switch between multi-user and single-user mode. Changes need a step-up like every admin change. */
@Controller('admin/single-user')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class SingleUserController {
  constructor(private readonly singleUser: SingleUserService) {}

  @Get()
  status(): Promise<SingleUserStatus> {
    return this.singleUser.status();
  }

  @Get('preview')
  preview(@Query() q: SingleUserPreviewQueryDto): Promise<SingleUserPreview> {
    return this.singleUser.preview(q.userId);
  }

  /** Irreversible: see SingleUserService.enable. Off on the public demo (it would delete every visitor's account). */
  @Post('enable')
  @HttpCode(200)
  @UseGuards(NotInDemoGuard)
  enable(@Body() body: EnableSingleUserDto, @Request() req: AuthRequest): Promise<SingleUserStatus> {
    return this.singleUser.enable(body, { id: req.user.userId, username: req.user.username });
  }

  @Post('disable')
  @HttpCode(200)
  @UseGuards(NotInDemoGuard)
  disable(@Request() req: AuthRequest): Promise<SingleUserStatus> {
    return this.singleUser.disable({ id: req.user.userId, username: req.user.username });
  }
}
