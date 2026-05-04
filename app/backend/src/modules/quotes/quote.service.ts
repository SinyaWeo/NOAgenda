import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from './quote.entity';

@Injectable()
export class QuoteService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
  ) {}

  async findAll(): Promise<Quote[]> {
    return this.quoteRepository.find();
  }

  async findById(id: number): Promise<Quote | null> {
    return this.quoteRepository.findOne({ where: { id } });
  }

  async findRandom(): Promise<Quote | null> {
    const count = await this.quoteRepository.count({ where: { isActive: true } });
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const results = await this.quoteRepository.find({ where: { isActive: true }, skip, take: 1 });
    return results[0] ?? null;
  }

  async create(quote: Partial<Quote>): Promise<Quote> {
    const newQuote = this.quoteRepository.create(quote);
    return this.quoteRepository.save(newQuote);
  }

  async update(id: number, data: Partial<Quote>): Promise<Quote | null> {
    await this.quoteRepository.update(id, data);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.quoteRepository.delete(id);
  }
}
