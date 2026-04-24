"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppI18nModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_i18n_1 = require("nestjs-i18n");
const path = require("path");
let AppI18nModule = class AppI18nModule {
};
exports.AppI18nModule = AppI18nModule;
exports.AppI18nModule = AppI18nModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            nestjs_i18n_1.I18nModule.forRoot({
                fallbackLanguage: 'en',
                loaderOptions: {
                    path: path.join(__dirname, '/locales/'),
                    watch: true,
                },
                resolvers: [
                    { use: nestjs_i18n_1.QueryResolver, options: ['lang', 'locale', 'l'] },
                    new nestjs_i18n_1.HeaderResolver(['x-custom-lang']),
                ],
            }),
        ],
        exports: [nestjs_i18n_1.I18nModule],
    })
], AppI18nModule);
//# sourceMappingURL=i18n.module.js.map