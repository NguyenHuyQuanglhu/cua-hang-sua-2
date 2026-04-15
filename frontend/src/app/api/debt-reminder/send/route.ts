import { NextRequest, NextResponse } from 'next/server';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetchWithAuth('/debt-reminder/send', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Debt reminder API error:', error);
    return NextResponse.json(
      { error: 'Failed to send debt reminder' },
      { status: 500 }
    );
  }
}
