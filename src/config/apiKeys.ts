import { auth } from './firebase';

export const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';

export async function getAuthBearerHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      return { 'Authorization': `Bearer ${token}` };
    } catch {
      return {};
    }
  }
  return {};
}
