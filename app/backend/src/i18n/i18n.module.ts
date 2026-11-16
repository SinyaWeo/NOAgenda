import { Module, Global } from '@nestjs/common';
import { I18nModule, QueryResolver, HeaderResolver } from 'nestjs-i18n';
import * as path from 'path';

@Global()
@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/locales/'),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [
        { use: QueryResolver, options: ['lang', 'locale', 'l'] },
        new HeaderResolver(['x-custom-lang']),
      ],
    }),
  ],
  exports: [I18nModule],
})
export class AppI18nModule {}
