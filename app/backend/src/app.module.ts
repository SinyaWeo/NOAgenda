import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { TaskAssigneeModule } from './modules/task-assignee/task-assignee.module';
import { TaskLabelModule } from './modules/task-label/task-label.module';
import { TaskRelationModule } from './modules/task-relation/task-relation.module';
import { ProjectUserModule } from './modules/project-user/project-user.module';
import { ProjectTeamModule } from './modules/project-team/project-team.module';
import { ProjectViewModule } from './modules/project-view/project-view.module';
import { TaskReminderModule } from './modules/task-reminder/task-reminder.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { SavedFilterModule } from './modules/saved-filter/saved-filter.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { ReactionModule } from './modules/reaction/reaction.module';
import { ApiTokenModule } from './modules/api-token/api-token.module';
import { SessionModule } from './modules/session/session.module';
import { KanbanBucketModule } from './modules/kanban-bucket/kanban-bucket.module';
import { AppI18nModule } from './i18n/i18n.module';
import { SearchModule } from './modules/search/search.module';
import { NodeModule } from './modules/node/node.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
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
    TaskAssigneeModule,
    TaskLabelModule,
    TaskRelationModule,
    ProjectUserModule,
    ProjectTeamModule,
    ProjectViewModule,
    TaskReminderModule,
    FavoriteModule,
    SavedFilterModule,
    SubscriptionModule,
    ReactionModule,
    ApiTokenModule,
    SessionModule,
    KanbanBucketModule,
    SearchModule,
    NodeModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
