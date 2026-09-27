import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db';
import { logger } from './logger';
export interface JWTPayload {
  id?: string;
  userId?: string;
  email: string;
  role: string;
  name?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-shopsphere-jwt-access-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-shopsphere-jwt-refresh-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class AuthService {
  static generateTokens(payload: JWTPayload) {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });
    return { accessToken, refreshToken };
  }

  static async register(data: { email: string; password: string; name: string; role?: string }) {
    const { email, password, name, role = 'customer' } = data;

    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      const err: any = new Error('User with this email already exists');
      err.statusCode = 409;
      throw err;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email.toLowerCase().trim(), passwordHash, name.trim(), role]
    );

    const user = result.rows[0];
    const payload: JWTPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const tokens = this.generateTokens(payload);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokens.refreshToken, expiresAt]
    );

    logger.info(`User registered successfully: ${user.email} (${user.id})`);
    return { user, ...tokens };
  }

  static async login(email: string, password: string) {
    const result = await pool.query(
      `SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      const err: any = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const err: any = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const payload: JWTPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const tokens = this.generateTokens(payload);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokens.refreshToken, expiresAt]
    );

    logger.info(`User logged in successfully: ${user.email} (${user.id})`);
    const { password_hash, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  static async refresh(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;

      // Verify token exists in database and has not expired
      const dbToken = await pool.query(
        `SELECT id, user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()`,
        [token]
      );

      if (dbToken.rows.length === 0) {
        const err: any = new Error('Refresh token is invalid or expired');
        err.statusCode = 401;
        throw err;
      }

      // Fetch latest user details
      const userRes = await pool.query(
        `SELECT id, email, name, role FROM users WHERE id = $1`,
        [decoded.id]
      );

      if (userRes.rows.length === 0) {
        const err: any = new Error('User not found');
        err.statusCode = 404;
        throw err;
      }

      const user = userRes.rows[0];
      const payload: JWTPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };

      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
      return { accessToken };
    } catch (err: any) {
      if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
        const customErr: any = new Error('Invalid or expired refresh token');
        customErr.statusCode = 401;
        throw customErr;
      }
      throw err;
    }
  }

  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (err: any) {
      const customErr: any = new Error('Invalid or expired access token');
      customErr.statusCode = 401;
      throw customErr;
    }
  }
}
