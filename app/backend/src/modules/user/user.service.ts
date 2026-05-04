import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    // Only expose public fields — email and internal flags are not needed for member autocomplete
    return this.userRepository.find({ select: ['id', 'username', 'name', 'avatarUrl', 'createdAt'] as any });
  }

  async findAllAdmin(): Promise<Omit<User, 'password'>[]> {
    const users = await this.userRepository.find();
    return users.map(({ password: _p, ...safe }) => safe as Omit<User, 'password'>);
  }

  async setRole(id: number, role: UserRole): Promise<User | null> {
    await this.userRepository.update(id, { role });
    return this.findById(id);
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByIdSafe(id: number): Promise<Omit<User, 'password'> | null> {
    const user = await this.userRepository.findOne({ where: { id }, select: ['id', 'username', 'name', 'avatarUrl', 'createdAt'] as any });
    return user;
  }

  async create(user: Partial<User>): Promise<User> {
    if (user.email) {
      const existingByEmail = await this.findByEmail(user.email);
      if (existingByEmail) {
        throw new ConflictException('Email is already in use');
      }
    }
    if (user.username) {
      const existingByUsername = await this.findByUsername(user.username);
      if (existingByUsername) {
        throw new ConflictException('Username is already in use');
      }
    }

    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
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
      data.password = await bcrypt.hash(data.password, 10);
    }
    await this.userRepository.update(id, data);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }
}
