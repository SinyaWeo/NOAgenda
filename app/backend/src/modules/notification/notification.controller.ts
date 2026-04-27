import { Controller, Get, Post, Delete, Body, Param, UseGuards, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Notification } from './notification.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Request() req: any): Promise<Notification[]> {
    return this.notificationService.findAll(req.user.userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: number, @Request() req: any): Promise<Notification> {
    const notification = await this.notificationService.findById(id);
    if (!notification) throw new NotFoundException();
    if (notification.user?.id !== req.user.userId) throw new ForbiddenException();
    return notification;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Notification>, @Request() req: any): Promise<Notification> {
    // Notifications created via the API are always scoped to the requesting user
    const { id: _id, user: _u, ...safeBody } = body as any;
    return this.notificationService.create({ ...safeBody, user: { id: req.user.userId } });
  }

  @Post('read/all')
  @UseGuards(AuthGuard('jwt'))
  async markAllAsRead(@Request() req: any): Promise<void> {
    return this.notificationService.markAllAsRead(req.user.userId);
  }

  @Post(':id/read')
  @UseGuards(AuthGuard('jwt'))
  async markAsRead(@Param('id') id: number, @Request() req: any): Promise<Notification> {
    const notification = await this.notificationService.findById(id);
    if (!notification) throw new NotFoundException();
    if (notification.user?.id !== req.user.userId) throw new ForbiddenException();
    const updated = await this.notificationService.markAsRead(id);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const notification = await this.notificationService.findById(id);
    if (!notification) throw new NotFoundException();
    if (notification.user?.id !== req.user.userId) throw new ForbiddenException();
    return this.notificationService.remove(id);
  }
}
