import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from './label.entity';

@Injectable()
export class LabelService {
  constructor(
    @InjectRepository(Label)
    private readonly labelRepository: Repository<Label>,
  ) {}

  async findAll(): Promise<Label[]> {
    return this.labelRepository.find();
  }

  async findById(id: number): Promise<Label | null> {
    return this.labelRepository.findOne({ where: { id } });
  }

  async create(label: Partial<Label>): Promise<Label> {
    const newLabel = this.labelRepository.create(label);
    return this.labelRepository.save(newLabel);
  }

  async update(id: number, data: Partial<Label>): Promise<Label | null> {
    await this.labelRepository.update(id, data);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.labelRepository.delete(id);
  }
}
