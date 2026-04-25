import { Controller, Get, Post, Delete, Body, Param, UseGuards, NotFoundException, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Notification } from './notification.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(): Promise<Notification[]> {
    return this.notificationService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Notification> {
    const notification = await this.notificationService.findById(id);
    if (!notification) throw new NotFoundException();
    return notification;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Notification>): Promise<Notification> {
    return this.notificationService.create(body);
  }

  @Post('read/all')
  @UseGuards(AuthGuard('jwt'))
  async markAllAsRead(@Request() req: any): Promise<void> {
    return this.notificationService.markAllAsRead(req.user.userId);
  }

  @Post(':id/read')
  @UseGuards(AuthGuard('jwt'))
  async markAsRead(@Param('id') id: number): Promise<Notification> {
    const notification = await this.notificationService.markAsRead(id);
    if (!notification) throw new NotFoundException();
    return notification;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number): Promise<void> {
    return this.notificationService.remove(id);
  }
}
