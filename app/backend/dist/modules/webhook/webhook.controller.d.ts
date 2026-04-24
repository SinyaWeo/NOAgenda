import { WebhookService } from './webhook.service';
import { Webhook } from './webhook.entity';
export declare class WebhookController {
    private readonly webhookService;
    constructor(webhookService: WebhookService);
    findAll(): Promise<Webhook[]>;
    findById(id: number): Promise<Webhook | null>;
    create(body: Partial<Webhook>): Promise<Webhook>;
    update(id: number, body: Partial<Webhook>): Promise<Webhook | null>;
    remove(id: number): Promise<void>;
}
