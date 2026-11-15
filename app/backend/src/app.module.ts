import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
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
import { QuoteModule } from './modules/quotes/quote.module';
import { AdminModule } from './modules/admin/admin.module';
import { AppSettingsModule } from './modules/app-settings/app-settings.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    AppI18nModule,
    MailModule,
    TypeOrmModule.forRoot({
      type: 'mariadb',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      // Versioned schema changes. In production pending migrations run on startup
      // (override with DB_MIGRATIONS_RUN=false to run them manually instead).
      migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
      migrationsRun:
        process.env.DB_MIGRATIONS_RUN !== undefined
          ? process.env.DB_MIGRATIONS_RUN === 'true'
          : process.env.NODE_ENV === 'production',
      // Auto schema sync is for local development only. In production it is off
      // unless explicitly enabled (e.g. DB_SYNCHRONIZE=true for the very first boot).
      synchronize:
        process.env.DB_SYNCHRONIZE !== undefined
          ? process.env.DB_SYNCHRONIZE === 'true'
          : process.env.NODE_ENV !== 'production',
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
    QuoteModule,
    AdminModule,
    AppSettingsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
