export declare class Webhook {
    id: number;
    url: string;
    event: string;
    secret?: string;
    active: boolean;
    config?: Record<string, any>;
}
