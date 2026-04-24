import { LabelService } from './label.service';
import { Label } from './label.entity';
export declare class LabelController {
    private readonly labelService;
    constructor(labelService: LabelService);
    findAll(): Promise<Label[]>;
    findById(id: number): Promise<Label | null>;
    create(body: Partial<Label>): Promise<Label>;
}
