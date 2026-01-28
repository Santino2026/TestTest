import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';

const envJwtSecret = process.env.JWT_SECRET;
if (!envJwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = envJwtSecret;
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

export interface User {
  id: string;
  email: string;
  name: string | null;
  has_purchased: boolean;
  purchased_at: Date | null;
  is_active: boolean;
  created_at: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
  hasPurchased: boolean;
}

export interface AuthResult {
  user: User;
  access_token: string;
  refresh_token: string;
}

function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateAccessToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    hasPurchased: user.has_purchased,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

function getRefreshTokenExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  return expiresAt;
}

async function storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
  await pool.query(
    `INSERT INTO sessions (user_id, refresh_token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, refreshToken, getRefreshTokenExpiry()]
  );
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function signup(
  email: string,
  password: string,
  name?: string
): Promise<AuthResult> {
  const passwordHash = await hashPassword(password);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, name, has_purchased, purchased_at, is_active, created_at`,
    [email.toLowerCase(), passwordHash, name || null]
  );

  if (result.rows.length === 0) {
    throw new Error('Email already registered');
  }

  const user = result.rows[0];
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();

  await storeRefreshToken(user.id, refreshToken);

  return { user, access_token: accessToken, refresh_token: refreshToken };
}

export async function login(
  email: string,
  password: string
): Promise<AuthResult> {
  const result = await pool.query(
    `SELECT id, email, name, password_hash, has_purchased, purchased_at, is_active, created_at
     FROM users
     WHERE email = $1 AND is_active = true`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];
  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    throw new Error('Invalid email or password');
  }

  await pool.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();

  await storeRefreshToken(user.id, refreshToken);

  delete user.password_hash;

  return { user, access_token: accessToken, refresh_token: refreshToken };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT s.*, u.id as user_id, u.email, u.name, u.has_purchased, u.purchased_at, u.is_active, u.created_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.refresh_token = $1 AND s.expires_at > NOW() AND u.is_active = true
       FOR UPDATE OF s`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Invalid or expired refresh token');
    }

    const session = result.rows[0];
    const user: User = {
      id: session.user_id,
      email: session.email,
      name: session.name,
      has_purchased: session.has_purchased,
      purchased_at: session.purchased_at,
      is_active: session.is_active,
      created_at: session.created_at,
    };

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();

    await client.query(
      `UPDATE sessions SET refresh_token = $1, expires_at = $2 WHERE id = $3`,
      [newRefreshToken, getRefreshTokenExpiry(), session.id]
    );

    await client.query('COMMIT');

    return { access_token: newAccessToken, refresh_token: newRefreshToken };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function logout(refreshToken: string): Promise<void> {
  await pool.query(
    'DELETE FROM sessions WHERE refresh_token = $1',
    [refreshToken]
  );
}

export async function getUserById(userId: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, email, name, has_purchased, purchased_at, is_active, created_at
     FROM users
     WHERE id = $1 AND is_active = true`,
    [userId]
  );

  return result.rows[0] || null;
}

export async function markUserPurchased(
  userId: string,
  stripeCustomerId: string,
  stripePaymentId: string
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE users
     SET has_purchased = true, purchased_at = NOW(),
         stripe_customer_id = $2, stripe_payment_id = $3
     WHERE id = $1 AND has_purchased = false
     RETURNING id`,
    [userId, stripeCustomerId, stripePaymentId]
  );
  return result.rows.length > 0;
}

export function authMiddleware(requirePurchase = false) {
  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (requirePurchase && !payload.hasPurchased) {
      return res.status(403).json({ error: 'Purchase required to access this resource' });
    }

    req.user = payload;
    next();
  };
}
