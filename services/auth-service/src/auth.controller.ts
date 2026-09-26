import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { pool } from './db';
import { logger } from './logger';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, role } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, and name are required',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long',
        });
      }

      const result = await AuthService.register({ email, password, name, role });
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
      }

      const result = await AuthService.login(email, password);
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
      }

      const result = await AuthService.refresh(refreshToken);
      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : (req.query.token as string || req.body?.token);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No authorization token provided',
        });
      }

      const decoded = AuthService.verifyToken(token);
      return res.status(200).json({
        success: true,
        data: { user: decoded, valid: true },
      });
    } catch (err) {
      next(err);
    }
  }

  static async health(req: Request, res: Response) {
    try {
      // Test DB connection
      const dbCheck = await pool.query('SELECT 1 as healthy');
      const isDbHealthy = dbCheck.rows.length > 0;

      return res.status(200).json({
        status: 'UP',
        service: 'auth-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        dependencies: {
          database: isDbHealthy ? 'HEALTHY' : 'UNHEALTHY',
        },
      });
    } catch (err: any) {
      return res.status(503).json({
        status: 'DOWN',
        service: 'auth-service',
        timestamp: new Date().toISOString(),
        error: err.message,
        dependencies: {
          database: 'UNHEALTHY',
        },
      });
    }
  }
}
