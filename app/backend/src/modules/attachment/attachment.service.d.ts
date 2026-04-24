import { Repository } from 'typeorm';
import { Attachment } from './attachment.entity';
export declare class AttachmentService {
    private readonly attachmentRepository;
    constructor(attachmentRepository: Repository<Attachment>);
    findAll(): Promise<Attachment[]>;
    findById(id: number): Promise<Attachment | null>;
    create(attachment: Partial<Attachment>): Promise<Attachment>;
}
