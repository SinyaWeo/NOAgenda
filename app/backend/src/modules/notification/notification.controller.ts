import { Controller, Get, Post, Delete, Body, Param, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Notification } from './notification.entity';
import { CreateNotificationDto } from './dto/notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(@Request() req: any): Promise<Notification[]> {
    return this.notificationService.findAll(req.user.userId);
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: any): Promise<Notification> {
    const notification = await this.notificationService.findById(id);
    if (!notification) throw new NotFoundException();
    if (notification.user?.id !== req.user.userId) throw new ForbiddenException();
    return notification;
  }

  @Post()
  async create(@Body() body: CreateNotificationDto, @Request() req: any): Promise<Notification> {
    // Notifications created via the API are always scoped to the requesting user
    return this.notificationService.create({ message: body.message, user: { id: req.user.userId } as any });
  }

  @Post('read/all')
  async markAllAsRead(@Request() req: any): Promise<void> {
    return this.notificationService.markAllAsRead(req.user.userId);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: number, @Request() req: any): Promise<Notification> {
    const notification = await this.notificationService.findById(id);
    if (!notification) throw new NotFoundException();
    if (notification.user?.id !== req.user.userId) throw new ForbiddenException();
    const updated = await this.notificationService.markAsRead(id);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const notification = await this.notificationService.findById(id);
    if (!notification) throw new NotFoundException();
    if (notification.user?.id !== req.user.userId) throw new ForbiddenException();
    return this.notificationService.remove(id);
  }
}
