import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TaskService } from './task.service';
import { Task } from './task.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  async findAll(): Promise<Task[]> {
    return this.taskService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Task | null> {
    return this.taskService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Task>): Promise<Task> {
    return this.taskService.create(body);
  }
}
