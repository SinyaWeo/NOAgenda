import { AttachmentService } from './attachment.service';
import { Attachment } from './attachment.entity';
export declare class AttachmentController {
    private readonly attachmentService;
    constructor(attachmentService: AttachmentService);
    findAll(): Promise<Attachment[]>;
    findById(id: number): Promise<Attachment | null>;
    upload(file: Express.Multer.File, body: any): Promise<Attachment>;
}
