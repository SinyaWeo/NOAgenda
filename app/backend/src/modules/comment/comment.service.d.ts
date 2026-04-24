import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
export declare class CommentService {
    private readonly commentRepository;
    constructor(commentRepository: Repository<Comment>);
    findAll(): Promise<Comment[]>;
    findById(id: number): Promise<Comment | null>;
    create(comment: Partial<Comment>): Promise<Comment>;
}
