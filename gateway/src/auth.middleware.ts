import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '@shopsphere/shared';
import { logger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-shopsphere-jwt-access-key-2026';

// Extend express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    // Inject custom headers for downstream microservices
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;
    if (decoded.name) {
      req.headers['x-user-name'] = encodeURIComponent(decoded.name);
    }
  } catch (err: any) {
    logger.warn('Optional auth token invalid or expired', { error: err.message });
  }
  next();
}

export function requireAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token required for this resource',
    });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    // Inject headers for downstream microservices
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;
    if (decoded.name) {
      req.headers['x-user-name'] = encodeURIComponent(decoded.name);
    }
    next();
  } catch (err: any) {
    logger.warn('Unauthorized request to protected endpoint', { error: err.message, path: req.path });
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token',
    });
  }
}
