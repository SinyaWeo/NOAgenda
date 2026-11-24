import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './note.entity';
import { NoteConvertDto, NoteCreateDto, NoteTarget, NoteUpdateDto } from './dto/note.dto';
import { TaskService } from '../task/task.service';
import { ProjectService } from '../project/project.service';
import { IdeaService } from '../idea/idea.service';
import { TaskAssignee } from '../task-assignee/task-assignee.entity';

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note) private readonly notes: Repository<Note>,
    @InjectRepository(TaskAssignee) private readonly assignees: Repository<TaskAssignee>,
    private readonly tasks: TaskService,
    private readonly projects: ProjectService,
    private readonly ideas: IdeaService,
  ) {}

  /** Open notes first (oldest first), then completed ones (most recently completed first). */
  async findAll(userId: number): Promise<Note[]> {
    const all = await this.notes.find({ where: { userId } });
    const open = all.filter((n) => !n.done).sort((a, b) => a.position - b.position || a.id - b.id);
    const done = all.filter((n) => n.done).sort((a, b) => (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0));
    return [...open, ...done];
  }

  async create(userId: number, dto: NoteCreateDto): Promise<Note> {
    const last = await this.notes.findOne({ where: { userId }, order: { position: 'DESC' } });
    return this.notes.save(
      this.notes.create({ text: dto.text, userId, done: false, doneAt: null, position: (last?.position ?? 0) + 1 }),
    );
  }

  async update(id: number, userId: number, dto: NoteUpdateDto): Promise<Note> {
    const note = await this.own(id, userId);
    if (dto.text !== undefined) note.text = dto.text;
    if (dto.done !== undefined && dto.done !== note.done) {
      note.done = dto.done;
      note.doneAt = dto.done ? new Date() : null;
    }
    return this.notes.save(note);
  }

  async remove(id: number, userId: number): Promise<void> {
    await this.own(id, userId);
    await this.notes.delete({ id, userId });
  }

  async removeCompleted(userId: number): Promise<void> {
    await this.notes.delete({ userId, done: true });
  }

  /** Create the project/task/idea from the note text, then drop the note. */
  async convert(id: number, userId: number, dto: NoteConvertDto): Promise<{ type: NoteTarget; id: number }> {
    const note = await this.own(id, userId);
    const created = await this.createTarget(userId, dto.to, note.text);
    await this.notes.delete({ id, userId });
    return { type: dto.to, id: created };
  }

  private async createTarget(userId: number, to: NoteTarget, text: string): Promise<number> {
    if (to === 'project') {
      return (await this.projects.create({ name: text, ownerId: userId }, userId)).id;
    }
    if (to === 'idea') return (await this.ideas.create(userId, { text })).id;
    const task = await this.tasks.create({ title: text, createdBy: userId }, userId);
    // Same as TaskController.create: every task is assigned, by default to its creator.
    await this.assignees.save(this.assignees.create({ node: { id: task.id }, user: { id: userId } }));
    return task.id;
  }

  private async own(id: number, userId: number): Promise<Note> {
    const note = await this.notes.findOne({ where: { id, userId } });
    if (!note) throw new NotFoundException();
    return note;
  }
}
