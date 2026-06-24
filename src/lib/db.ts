import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MongoClient, Db } from 'mongodb';

// Define DB paths for local fallback
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Interface definitions
export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  isWeb3: boolean;
  walletAddress?: string;
  createdAt: string;
}

export interface VaultItem {
  id: string;
  userId: string;
  type: 'login' | 'card' | 'note' | 'identity';
  title: string;       // Encrypted ciphertext
  titleIv: string;     // IV for title
  fields: string;      // Encrypted fields JSON string
  fieldsIv: string;    // IV for fields
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DatabaseSchema {
  users: User[];
  items: VaultItem[];
}

// Helper to ensure directory and database exist (local fallback)
function initDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = { users: [], items: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content) as DatabaseSchema;
  } catch (error) {
    console.error('Failed to read database, resetting database...', error);
    const initialData: DatabaseSchema = { users: [], items: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
}

// Synchronous save function for local fallback
function saveDb(data: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// MongoDB Connection Caching
const uri = process.env.MONGODB_URI;
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

async function getMongoDb(): Promise<Db> {
  if (!uri) throw new Error('MONGODB_URI environment variable is not defined');
  if (mongoDb) return mongoDb;

  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  const dbName = uri.split('/').pop()?.split('?')[0] || 'krakens_vault';
  mongoDb = mongoClient.db(dbName);

  // Auto-initialize indexes for production performance
  await mongoDb.collection('users').createIndex({ email: 1 }, { unique: true });
  await mongoDb.collection('items').createIndex({ userId: 1 });

  return mongoDb;
}

// Exported operations (Supports async database operations for production)
export const db = {
  // User operations
  async getUsers(): Promise<User[]> {
    if (process.env.MONGODB_URI) {
      const conn = await getMongoDb();
      const users = await conn.collection('users').find({}).toArray();
      return users.map(u => ({ ...u, id: u.id || u._id.toString() } as unknown as User));
    }
    return initDb().users;
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    const emailLower = email.toLowerCase().trim();
    if (process.env.MONGODB_URI) {
      const conn = await getMongoDb();
      const user = await conn.collection('users').findOne({ email: emailLower });
      if (!user) return undefined;
      return { ...user, id: user.id || user._id.toString() } as unknown as User;
    }
    return initDb().users.find(u => u.email.toLowerCase() === emailLower);
  },

  async getUserById(id: string): Promise<User | undefined> {
    if (process.env.MONGODB_URI) {
      const conn = await getMongoDb();
      const user = await conn.collection('users').findOne({ id });
      if (!user) return undefined;
      return { ...user, id: user.id || user._id.toString() } as unknown as User;
    }
    return initDb().users.find(u => u.id === id);
  },

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const newUser: User = {
      ...user,
      id,
      email: user.email.toLowerCase().trim(),
      createdAt,
    };

    if (process.env.MONGODB_URI) {
      const conn = await getMongoDb();
      try {
        await conn.collection('users').insertOne({
          _id: id as any,
          id,
          email: newUser.email,
          passwordHash: newUser.passwordHash,
          isWeb3: newUser.isWeb3,
          createdAt,
        });
      } catch (err: any) {
        if (err.code === 11000) {
          const existing = await conn.collection('users').findOne({ email: newUser.email });
          if (existing) return { ...existing, id: existing.id || existing._id.toString() } as unknown as User;
        }
        throw err;
      }
      return newUser;
    }

    const data = initDb();
    const existing = data.users.find(u => u.email.toLowerCase() === newUser.email);
    if (existing) return existing;

    data.users.push(newUser);
    saveDb(data);
    return newUser;
  },

  // Vault item operations
  async getItems(userId: string): Promise<VaultItem[]> {
    if (process.env.MONGODB_URI) {
      const conn = await getMongoDb();
      const items = await conn.collection('items').find({ userId }).toArray();
      return items.map(item => ({
        ...item,
        id: item.id || item._id.toString(),
      } as unknown as VaultItem));
    }
    return initDb().items.filter(item => item.userId === userId);
  },

  async getItemById(itemId: string, userId: string): Promise<VaultItem | undefined> {
    if (process.env.MONGODB_URI) {
      const conn = await getMongoDb();
      const item = await conn.collection('items').findOne({ id: itemId, userId });
      if (!item) return undefined;
      return { ...item, id: item.id || item._id.toString() } as unknown as VaultItem;
    }
    return initDb().items.find(item => item.id === itemId && item.userId === userId);
  },

  async createItem(item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<VaultItem> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const updatedAt = new Date().toISOString();
    const newItem: VaultItem = {
      ...item,
      id,
      createdAt,
      updatedAt,
    };

    if (process.env.MONGODB_URI) {
      const conn = await getMongoDb();
      await conn.collection('items').insertOne({
        _id: id as any,
        ...newItem
      });
      return newItem;
    }

    const data = initDb();
    data.items.push(newItem);
    saveDb(data);
    return newItem;
  },

  async updateItem(itemId: string, userId: string, updates: Partial<Omit<VaultItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<VaultItem | null> {
    const updatedAt = new Date().toISOString();

    if (process.env.MONGODB_URI) {
      const conn = await getMongoDb();
      const res = await conn.collection('items').findOneAndUpdate(
        { id: itemId, userId },
        { $set: { ...updates, updatedAt } },
        { returnDocument: 'after' }
      );
      if (!res) return null;
      return { ...res, id: res.id || res._id.toString() } as unknown as VaultItem;
    }

    const data = initDb();
    const itemIndex = data.items.findIndex(item => item.id === itemId && item.userId === userId);
    if (itemIndex === -1) return null;

    const updatedItem: VaultItem = {
      ...data.items[itemIndex],
      ...updates,
      updatedAt,
    };

    data.items[itemIndex] = updatedItem;
    saveDb(data);
    return updatedItem;
  },

  async deleteItem(itemId: string, userId: string): Promise<boolean> {
    if (process.env.MONGODB_URI) {
      const conn = await getMongoDb();
      const res = await conn.collection('items').deleteOne({ id: itemId, userId });
      return res.deletedCount > 0;
    }

    const data = initDb();
    const initialLength = data.items.length;
    data.items = data.items.filter(item => !(item.id === itemId && item.userId === userId));
    
    if (data.items.length === initialLength) {
      return false; // Item not found
    }
    
    saveDb(data);
    return true;
  }
};
