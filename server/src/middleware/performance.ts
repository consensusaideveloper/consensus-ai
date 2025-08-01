import { Request, Response, NextFunction } from 'express';

export interface PerformanceMetrics {
    requestCount: number;
    averageResponseTime: number;
    slowRequests: number;
    errorCount: number;
    activeRequests: number;
}

class PerformanceMonitor {
    private metrics: PerformanceMetrics = {
        requestCount: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        errorCount: 0,
        activeRequests: 0
    };

    private responseTimes: number[] = [];
    private readonly maxStoredTimes = 1000;
    private readonly slowRequestThreshold = 2000; // 2 seconds

    incrementRequest(): void {
        this.metrics.requestCount++;
        this.metrics.activeRequests++;
    }

    recordResponseTime(time: number, isError: boolean = false): void {
        this.metrics.activeRequests--;
        
        if (isError) {
            this.metrics.errorCount++;
        }

        this.responseTimes.push(time);
        
        // Keep only the most recent response times
        if (this.responseTimes.length > this.maxStoredTimes) {
            this.responseTimes.shift();
        }

        // Update average response time
        this.metrics.averageResponseTime = 
            this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;

        // Check if it's a slow request
        if (time > this.slowRequestThreshold) {
            this.metrics.slowRequests++;
        }
    }

    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    reset(): void {
        this.metrics = {
            requestCount: 0,
            averageResponseTime: 0,
            slowRequests: 0,
            errorCount: 0,
            activeRequests: 0
        };
        this.responseTimes = [];
    }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Increment request count
    performanceMonitor.incrementRequest();

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
        const responseTime = Date.now() - startTime;
        const isError = res.statusCode >= 400;
        
        performanceMonitor.recordResponseTime(responseTime, isError);
        
        // Log slow requests
        if (responseTime > 2000) {
            console.warn(`🐌 Slow request detected: ${req.method} ${req.path} - ${responseTime}ms`);
        }

        // Log errors
        if (isError) {
            console.error(`❌ Error response: ${req.method} ${req.path} - ${res.statusCode}`);
        }

        return originalEnd.call(this, chunk, encoding);
    };

    next();
};

export const getPerformanceMetrics = (): PerformanceMetrics => {
    return performanceMonitor.getMetrics();
};

export const resetPerformanceMetrics = (): void => {
    performanceMonitor.reset();
};

// Rate limiting middleware
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
    const requestCounts = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
        const clientId = req.ip || 'unknown';
        const now = Date.now();
        
        const clientData = requestCounts.get(clientId);
        
        if (!clientData || now > clientData.resetTime) {
            // Reset or initialize for this client
            requestCounts.set(clientId, {
                count: 1,
                resetTime: now + windowMs
            });
            next();
        } else if (clientData.count < maxRequests) {
            // Increment count
            clientData.count++;
            next();
        } else {
            // Rate limit exceeded
            res.status(429).json({
                error: 'Too many requests',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
            });
        }
    };
};

// Memory monitoring
export const getMemoryUsage = () => {
    const usage = process.memoryUsage();
    return {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024), // MB
        arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) // MB
    };
};

// CPU monitoring (basic)
export const getCPUUsage = () => {
    const cpus = require('os').cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu: any) => {
        for (const type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });

    const idlePercentage = totalIdle / totalTick;
    const usagePercentage = 1 - idlePercentage;

    return {
        usage: Math.round(usagePercentage * 100),
        cores: cpus.length
    };
};