export type UserRole = 'user' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
  role: UserRole;
  language?: string;
  timezone?: string;
  theme?: string;
  weekStart?: number;
  defaultProjectId?: number;
  avatarUrl?: string;
  isEmailConfirmed: boolean;
  isDeletionRequested: boolean;
  deletionScheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  ownerId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: number;
  text: string;
  author?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
