import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, QueryFailedError } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import { hashPassword } from '../../common/password';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /** Query builder that also selects the (select:false) password hash. */
  private withPassword() {
    return this.userRepository.createQueryBuilder('u').addSelect('u.password');
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.withPassword().where('u.username = :username', { username }).getOne();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.withPassword().where('u.email = :email', { email }).getOne();
  }

  /** Saved interface language per user id (null when unset), for text sent while they are away. */
  async languagesOf(ids: number[]): Promise<Map<number, string | null>> {
    if (!ids.length) return new Map();
    const rows = await this.userRepository.find({ where: { id: In(ids) }, select: ['id', 'language'] });
    return new Map(rows.map((u) => [u.id, u.language ?? null]));
  }

  /** Public fields of users whose username or display name contains `q` (the caller is left out). */
  async search(q: string, exceptUserId: number): Promise<Pick<User, 'id' | 'username' | 'name' | 'avatarUrl'>[]> {
    const like = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
    return this.userRepository
      .createQueryBuilder('u')
      .select(['u.id', 'u.username', 'u.name', 'u.avatarUrl'])
      .where('u.id != :me', { me: exceptUserId })
      .andWhere('u.isLocked = 0')
      .andWhere('(u.username LIKE :like OR u.name LIKE :like)', { like })
      .orderBy('u.username', 'ASC')
      .limit(10)
      .getMany();
  }

  async findAllAdmin(): Promise<Omit<User, 'password'>[]> {
    const users = await this.userRepository.find();
    return users.map(({ password: _p, ...safe }) => safe as Omit<User, 'password'>);
  }

  async setRole(id: number, role: UserRole): Promise<User | null> {
    await this.userRepository.update(id, { role });
    return this.findById(id);
  }

  async setLocked(id: number, isLocked: boolean): Promise<User | null> {
    await this.userRepository.update(id, { isLocked });
    return this.findById(id);
  }

  async countAdmins(): Promise<number> {
    return this.userRepository.count({ where: { role: UserRole.ADMIN } });
  }

  async findById(id: number): Promise<User | null> {
    return this.withPassword().where('u.id = :id', { id }).getOne();
  }

  async findByIdSafe(id: number): Promise<Omit<User, 'password'> | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'name', 'avatarUrl', 'createdAt'] as any,
    });
    return user;
  }

  async create(user: Partial<User>): Promise<User> {
    if (user.email) {
      const existingByEmail = await this.findByEmail(user.email);
      if (existingByEmail) {
        throw new ConflictException('Username or email is already in use');
      }
    }
    if (user.username) {
      const existingByUsername = await this.findByUsername(user.username);
      if (existingByUsername) {
        throw new ConflictException('Username or email is already in use');
      }
    }

    if (user.password) {
      user.password = await hashPassword(user.password);
    }
    const newUser = this.userRepository.create(user);
    try {
      return await this.userRepository.save(newUser);
    } catch (err: unknown) {
      // Handle race conditions where another request inserts the same unique field first.
      if (err instanceof QueryFailedError && (err as any).driverError?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Username or email is already in use');
      }
      throw err;
    }
  }

  async update(id: number, data: Partial<User>): Promise<User | null> {
    if (data.password) {
      data.password = await hashPassword(data.password);
    }
    await this.userRepository.update(id, data);
    return this.findById(id);
  }

  /**
   * Atomically count a failed login; after `maxAttempts` consecutive failures the
   * account is locked until `lockedUntil` and the counter restarts.
   */
  async recordFailedLogin(id: number, maxAttempts: number, lockedUntil: Date): Promise<void> {
    await this.userRepository.query(
      `UPDATE users SET
         lockedUntil = IF(failedLoginAttempts + 1 >= ?, ?, lockedUntil),
         failedLoginAttempts = IF(failedLoginAttempts + 1 >= ?, 0, failedLoginAttempts + 1)
       WHERE id = ?`,
      [maxAttempts, lockedUntil, maxAttempts, id],
    );
  }

  async resetLoginState(id: number): Promise<void> {
    await this.userRepository.update(id, { failedLoginAttempts: 0, lockedUntil: null as any });
  }

  /** Store an already-hashed password (e.g. a cost upgrade) without re-hashing it. */
  async setPasswordHash(id: number, hash: string): Promise<void> {
    await this.userRepository.update(id, { password: hash });
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }
}
