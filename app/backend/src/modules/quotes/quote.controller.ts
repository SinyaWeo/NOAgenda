import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/quote.dto';
import { QuoteService } from './quote.service';
import { Quote } from './quote.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../user/user-role.enum';
import { Public } from '../../common/decorators/public.decorator';

@Controller('quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  /** Public — no auth required */
  @Public()
  @Get('random')
  async getRandom(): Promise<Quote | null> {
    return this.quoteService.findRandom();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(): Promise<Quote[]> {
    return this.quoteService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() body: CreateQuoteDto): Promise<Quote> {
    return this.quoteService.create(body);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: number, @Body() body: UpdateQuoteDto): Promise<Quote> {
    const updated = await this.quoteService.update(id, body);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: number): Promise<void> {
    const quote = await this.quoteService.findById(id);
    if (!quote) throw new NotFoundException();
    return this.quoteService.remove(id);
  }
}
