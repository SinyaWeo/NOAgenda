import { Controller, Get, Post, Body, Param, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentService } from './attachment.service';
import { AuthGuard } from '@nestjs/passport';
import { Attachment } from './attachment.entity';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('attachments')
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Get()
  async findAll(): Promise<Attachment[]> {
    return this.attachmentService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Attachment | null> {
    return this.attachmentService.findById(id);
  }

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
      },
    }),
  }))
  async upload(@UploadedFile() file: Express.Multer.File, @Body() body: any): Promise<Attachment> {
    // You should validate and resolve task/uploader relations here
    return this.attachmentService.create({
      filename: file.originalname,
      path: file.path,
      ...body,
    });
  }
}
