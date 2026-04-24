import { CommentService } from './comment.service';
import { Comment } from './comment.entity';
export declare class CommentController {
    private readonly commentService;
    constructor(commentService: CommentService);
    findAll(): Promise<Comment[]>;
    findById(id: number): Promise<Comment | null>;
    create(body: Partial<Comment>): Promise<Comment>;
}
