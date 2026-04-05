import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.BACKEND_URL || 'http://localhost:3001/api';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const storeId = request.headers.get('x-store-id');
    const threshold = request.nextUrl.searchParams.get('threshold') || '10';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) headers['Authorization'] = token;
    if (storeId) headers['X-Store-Id'] = storeId;

    const response = await fetch(`${API_URL}/products/low-stock?threshold=${encodeURIComponent(threshold)}`, {
      headers,
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
