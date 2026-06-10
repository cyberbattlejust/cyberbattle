import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  return fetch(new URL('/api/rooms/control', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, action: 'start' }),
  });
}
