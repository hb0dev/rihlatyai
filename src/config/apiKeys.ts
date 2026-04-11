import { auth } from './firebase';

export const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Token refresh failed, continue without auth
    }
  }

  return headers;
}

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
