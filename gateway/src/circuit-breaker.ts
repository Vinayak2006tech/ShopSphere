import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;     // Number of failures before tripping (default 5)
  recoveryTimeout?: number;      // ms before moving to HALF_OPEN (default 10000)
  successThreshold?: number;     // Successes in HALF_OPEN to close (default 2)
}

export class CircuitBreaker {
  private serviceName: string;
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  private failureThreshold: number;
  private recoveryTimeout: number;
  private successThreshold: number;

  constructor(serviceName: string, options: CircuitBreakerOptions = {}) {
    this.serviceName = serviceName;
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 10000;
    this.successThreshold = options.successThreshold || 2;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      logger.warn(`[CircuitBreaker] ${this.serviceName} transition OPEN -> HALF_OPEN (probing)`);
    }
    return this.state;
  }

  public recordSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        logger.info(`[CircuitBreaker] ${this.serviceName} transition HALF_OPEN -> CLOSED (recovered)`);
      }
    }
  }

  public recordFailure() {
    this.failureCount++;
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.recoveryTimeout;
      logger.error(`[CircuitBreaker] ${this.serviceName} tripped OPEN! Failing fast for ${this.recoveryTimeout}ms`);
    }
  }

  public getStatus() {
    return {
      service: this.serviceName,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const currentState = this.getState();
      if (currentState === 'OPEN') {
        const retryAfter = Math.max(1, Math.ceil((this.nextAttempt - Date.now()) / 1000));
        res.setHeader('Retry-After', retryAfter.toString());
        return res.status(503).json({
          success: false,
          error: `Circuit breaker OPEN: ${this.serviceName} is temporarily unavailable. Fail fast active.`,
          service: this.serviceName,
          circuitState: 'OPEN',
          retryAfterSeconds: retryAfter,
        });
      }
      next();
    };
  }
}

// Registry of circuit breakers for gateway services
export const circuitBreakers: Record<string, CircuitBreaker> = {
  auth: new CircuitBreaker('auth-service'),
  product: new CircuitBreaker('product-service'),
  order: new CircuitBreaker('order-service'),
  payment: new CircuitBreaker('payment-service'),
  notification: new CircuitBreaker('notification-service'),
  search: new CircuitBreaker('search-service'),
  recommendation: new CircuitBreaker('recommendation-service'),
  review: new CircuitBreaker('review-service'),
};
