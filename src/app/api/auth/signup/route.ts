import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, authHash } = body;

    if (!email || !authHash) {
      return NextResponse.json({ error: 'Email and master password hash are required' }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 400 });
    }

    // Server hash of authHash using bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(authHash, salt);

    const user = await db.createUser({
      email: email.toLowerCase(),
      passwordHash,
      isWeb3: false,
    });

    return NextResponse.json({
      success: true,
      message: 'Account registered successfully',
      user: { id: user.id, email: user.email, isWeb3: false }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
