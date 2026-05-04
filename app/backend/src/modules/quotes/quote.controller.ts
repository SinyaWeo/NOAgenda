import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuoteService } from './quote.service';
import { Quote } from './quote.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../user/user-role.enum';

@Controller('quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  /** Public — no auth required */
  @Get('random')
  async getRandom(): Promise<Quote | null> {
    return this.quoteService.findRandom();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(): Promise<Quote[]> {
    return this.quoteService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(
    @Body() body: { text: string; author?: string; isActive?: boolean },
  ): Promise<Quote> {
    return this.quoteService.create(body);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: number,
    @Body() body: { text?: string; author?: string; isActive?: boolean },
  ): Promise<Quote> {
    const updated = await this.quoteService.update(id, body);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: number): Promise<void> {
    const quote = await this.quoteService.findById(id);
    if (!quote) throw new NotFoundException();
    return this.quoteService.remove(id);
  }
}
