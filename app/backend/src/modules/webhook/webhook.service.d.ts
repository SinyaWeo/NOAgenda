import { Repository } from 'typeorm';
import { Webhook } from './webhook.entity';
export declare class WebhookService {
    private readonly webhookRepository;
    constructor(webhookRepository: Repository<Webhook>);
    findAll(): Promise<Webhook[]>;
    findById(id: number): Promise<Webhook | null>;
    create(data: Partial<Webhook>): Promise<Webhook>;
    update(id: number, data: Partial<Webhook>): Promise<Webhook | null>;
    remove(id: number): Promise<void>;
}
