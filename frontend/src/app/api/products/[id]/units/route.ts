import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.BACKEND_URL || 'http://localhost:3001/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization');
    const storeId = request.headers.get('x-store-id');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) headers['Authorization'] = token;
    if (storeId) headers['X-Store-Id'] = storeId;
    
    const response = await fetch(`${API_URL}/products/${id}/units`, { headers });
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization');
    const storeId = request.headers.get('x-store-id');
    const body = await request.json();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) headers['Authorization'] = token;
    if (storeId) headers['X-Store-Id'] = storeId;
    
    const response = await fetch(`${API_URL}/products/${id}/units`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization');
    const storeId = request.headers.get('x-store-id');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) headers['Authorization'] = token;
    if (storeId) headers['X-Store-Id'] = storeId;
    
    const response = await fetch(`${API_URL}/products/${id}/units`, {
      method: 'DELETE',
      headers,
    });
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
