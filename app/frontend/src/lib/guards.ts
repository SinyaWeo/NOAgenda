import { goto } from '$app/navigation';
import { getCurrentUser } from './auth';

export async function requireAdmin(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    goto('/dashboard');
  }
}
