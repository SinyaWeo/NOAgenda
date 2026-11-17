import { Module, Global } from '@nestjs/common';
import { I18nModule, QueryResolver, HeaderResolver } from 'nestjs-i18n';
import * as path from 'path';
import { Translator } from './translator.service';

@Global()
@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/locales/'),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [{ use: QueryResolver, options: ['lang', 'locale', 'l'] }, new HeaderResolver(['x-custom-lang'])],
    }),
  ],
  providers: [Translator],
  exports: [I18nModule, Translator],
})
export class AppI18nModule {}
