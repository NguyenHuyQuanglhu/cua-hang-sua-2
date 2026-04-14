/**
 * Fetch wrapper that automatically includes auth headers
 * Calls backend directly instead of going through Next.js API routes
 */

const BACKEND_URL = 'http://localhost:3001/api';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const storeId = typeof window !== 'undefined' ? localStorage.getItem('store_id') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const hasAuthHeader = Object.keys(headers).some((key) => key.toLowerCase() === 'authorization');
  if (token && !hasAuthHeader) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const hasStoreHeader = Object.keys(headers).some((key) => key.toLowerCase() === 'x-store-id');
  if (storeId && !hasStoreHeader) {
    headers['X-Store-Id'] = storeId;
  }

  // Convert /api/* routes to backend URL
  let finalUrl = url;
  if (url.startsWith('/api/')) {
    finalUrl = `${BACKEND_URL}${url.substring(4)}`; // Remove /api prefix, backend already has /api
  }

  return fetch(finalUrl, {
    ...options,
    headers,
  });
}

export default fetchWithAuth;
