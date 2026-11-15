import { goto } from '$app/navigation';
import { getCurrentUser } from './auth';

/** Kept for pages that still call it; the admin layout already refuses to render for non-admins. */
export async function requireAdmin(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    goto('/dashboard');
  }
}
