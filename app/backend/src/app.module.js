"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const user_module_1 = require("./modules/user/user.module");
const auth_module_1 = require("./modules/auth/auth.module");
const project_module_1 = require("./modules/project/project.module");
const task_module_1 = require("./modules/task/task.module");
const team_module_1 = require("./modules/team/team.module");
const team_member_module_1 = require("./modules/team-member/team-member.module");
const label_module_1 = require("./modules/label/label.module");
const comment_module_1 = require("./modules/comment/comment.module");
const notification_module_1 = require("./modules/notification/notification.module");
const attachment_module_1 = require("./modules/attachment/attachment.module");
const webhook_module_1 = require("./modules/webhook/webhook.module");
const plugin_module_1 = require("./modules/plugin/plugin.module");
const i18n_module_1 = require("./i18n/i18n.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            i18n_module_1.AppI18nModule,
            typeorm_1.TypeOrmModule.forRoot({
                type: 'mariadb',
                host: process.env.DB_HOST,
                port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_DATABASE,
                autoLoadEntities: true,
                synchronize: true,
            }),
            user_module_1.UserModule,
            auth_module_1.AuthModule,
            project_module_1.ProjectModule,
            task_module_1.TaskModule,
            team_module_1.TeamModule,
            team_member_module_1.TeamMemberModule,
            label_module_1.LabelModule,
            comment_module_1.CommentModule,
            notification_module_1.NotificationModule,
            attachment_module_1.AttachmentModule,
            webhook_module_1.WebhookModule,
            plugin_module_1.PluginModule,
        ],
        controllers: [app_controller_1.AppController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map