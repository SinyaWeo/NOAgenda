import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
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
  async findById(@Param('id') id: number): Promise<Notification | null> {
    return this.notificationService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Notification>): Promise<Notification> {
    return this.notificationService.create(body);
  }
}
