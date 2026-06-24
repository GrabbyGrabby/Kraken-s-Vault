import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-super-secret-vault-key-12345';

// Helper to authenticate request and get userId
function getUserIdFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// GET: Retrieve all vault items for the authenticated user
export async function GET(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await db.getItems(userId);
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error('GET items error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Save a new encrypted vault item
export async function POST(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, titleIv, fields, fieldsIv, favorite } = body;

    if (!type || !title || !titleIv || !fields || !fieldsIv) {
      return NextResponse.json({ error: 'Missing required fields for vault item' }, { status: 400 });
    }

    const newItem = await db.createItem({
      userId,
      type,
      title,
      titleIv,
      fields,
      fieldsIv,
      favorite: !!favorite
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    console.error('POST item error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update an existing encrypted vault item
export async function PUT(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, type, title, titleIv, fields, fieldsIv, favorite } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required for updates' }, { status: 400 });
    }

    const updates: any = {};
    if (type !== undefined) updates.type = type;
    if (title !== undefined) updates.title = title;
    if (titleIv !== undefined) updates.titleIv = titleIv;
    if (fields !== undefined) updates.fields = fields;
    if (fieldsIv !== undefined) updates.fieldsIv = fieldsIv;
    if (favorite !== undefined) updates.favorite = !!favorite;

    const updatedItem = await db.updateItem(id, userId, updates);
    if (!updatedItem) {
      return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error: any) {
    console.error('PUT item error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a vault item
export async function DELETE(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required for deletion' }, { status: 400 });
    }

    const success = await db.deleteItem(id, userId);
    if (!success) {
      return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Item deleted successfully' });
  } catch (error: any) {
    console.error('DELETE item error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
