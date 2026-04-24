import { Repository } from 'typeorm';
import { Label } from './label.entity';
export declare class LabelService {
    private readonly labelRepository;
    constructor(labelRepository: Repository<Label>);
    findAll(): Promise<Label[]>;
    findById(id: number): Promise<Label | null>;
    create(label: Partial<Label>): Promise<Label>;
}
