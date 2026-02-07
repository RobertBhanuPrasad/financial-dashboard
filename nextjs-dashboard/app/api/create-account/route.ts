import { createAccount } from '@/app/lib/action';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json(); 
  const result = await createAccount(body); 

  return NextResponse.json({ message: result.message }, { status: result.status });
}