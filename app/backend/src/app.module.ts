import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectModule } from './modules/project/project.module';
import { TaskModule } from './modules/task/task.module';
import { TeamModule } from './modules/team/team.module';
import { TeamMemberModule } from './modules/team-member/team-member.module';
import { LabelModule } from './modules/label/label.module';
import { CommentModule } from './modules/comment/comment.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AttachmentModule } from './modules/attachment/attachment.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { PluginModule } from './modules/plugin/plugin.module';
import { AppI18nModule } from './i18n/i18n.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppI18nModule,
    TypeOrmModule.forRoot({
      type: 'mariadb',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: true, // Set to false in production
    }),
    UserModule,
    AuthModule,
    ProjectModule,
    TaskModule,
    TeamModule,
    TeamMemberModule,
    LabelModule,
    CommentModule,
    NotificationModule,
    AttachmentModule,
    WebhookModule,
    PluginModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
