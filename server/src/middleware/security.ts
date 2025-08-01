import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

// Input sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    const sanitizeValue = (value: any): any => {
        if (typeof value === 'string') {
            // Remove potentially dangerous characters and scripts
            return value
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .trim();
        }
        if (typeof value === 'object' && value !== null) {
            const sanitized: any = Array.isArray(value) ? [] : {};
            for (const key in value) {
                sanitized[key] = sanitizeValue(value[key]);
            }
            return sanitized;
        }
        return value;
    };

    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    
    if (req.query) {
        req.query = sanitizeValue(req.query);
    }

    next();
};

// Request size limiting
export const requestSizeLimit = (maxSizeKB: number = 1024) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = parseInt(req.headers['content-length'] || '0');
        const maxSizeBytes = maxSizeKB * 1024;

        if (contentLength > maxSizeBytes) {
            logger.logSecurityEvent('Request size limit exceeded', {
                contentLength,
                maxAllowed: maxSizeBytes,
                path: req.path
            }, undefined, req.ip);

            throw new AppError(
                413,
                'PAYLOAD_TOO_LARGE',
                `Request size exceeds limit of ${maxSizeKB}KB`
            );
        }

        next();
    };
};

// SQL injection protection (basic)
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /(--|\#|\*\/|\*)/g,
        /(\b(OR|AND)\b.*=.*)/gi
    ];

    const checkValue = (value: any, path: string = ''): boolean => {
        if (typeof value === 'string') {
            for (const pattern of sqlPatterns) {
                if (pattern.test(value)) {
                    logger.logSecurityEvent('Potential SQL injection attempt', {
                        value: value.substring(0, 200),
                        path: req.path,
                        field: path
                    }, undefined, req.ip);
                    return true;
                }
            }
        }
        if (typeof value === 'object' && value !== null) {
            for (const key in value) {
                if (checkValue(value[key], `${path}.${key}`)) {
                    return true;
                }
            }
        }
        return false;
    };

    if (req.body && checkValue(req.body, 'body')) {
        throw new AppError(
            400,
            'INVALID_INPUT',
            'Invalid characters detected in request'
        );
    }

    if (req.query && checkValue(req.query, 'query')) {
        throw new AppError(
            400,
            'INVALID_INPUT',
            'Invalid characters detected in query'
        );
    }

    next();
};

// API key validation for public endpoints
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

    // Skip validation in development mode or if no API keys are configured
    if (process.env.NODE_ENV === 'development' || validApiKeys.length === 0) {
        next();
        return;
    }

    if (!apiKey || !validApiKeys.includes(apiKey)) {
        logger.logSecurityEvent('Invalid API key attempt', {
            providedKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'none',
            path: req.path
        }, undefined, req.ip);

        throw new AppError(
            401,
            'INVALID_API_KEY',
            'Valid API key required'
        );
    }

    next();
};

// Suspicious activity detection
const suspiciousActivityTracker = new Map<string, {
    requests: number;
    errors: number;
    lastActivity: number;
    suspicious: boolean;
}>();

export const suspiciousActivityDetection = (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    let activity = suspiciousActivityTracker.get(clientId);
    
    if (!activity || (now - activity.lastActivity) > windowMs) {
        activity = {
            requests: 0,
            errors: 0,
            lastActivity: now,
            suspicious: false
        };
    }

    activity.requests++;
    activity.lastActivity = now;

    // Track errors
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
        if (res.statusCode >= 400) {
            activity!.errors++;
        }

        // Check for suspicious patterns
        const errorRate = activity!.errors / activity!.requests;
        const isHighVolume = activity!.requests > 100; // 100 requests per minute
        const isHighErrorRate = errorRate > 0.5; // 50% error rate

        if ((isHighVolume || isHighErrorRate) && !activity!.suspicious) {
            activity!.suspicious = true;
            logger.logSecurityEvent('Suspicious activity detected', {
                requests: activity!.requests,
                errors: activity!.errors,
                errorRate,
                path: req.path
            }, undefined, req.ip);
        }

        return originalEnd.call(this, chunk, encoding);
    };

    suspiciousActivityTracker.set(clientId, activity);

    // Block if marked as suspicious and error rate is very high
    if (activity.suspicious && (activity.errors / activity.requests) > 0.8) {
        throw new AppError(
            429,
            'SUSPICIOUS_ACTIVITY',
            'Temporary access restriction due to suspicious activity'
        );
    }

    next();
};

// Content Security Policy headers
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    
    next();
};

// CORS configuration for production
export const configureCORS = () => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    return {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                logger.logSecurityEvent('CORS violation', {
                    origin,
                    allowedOrigins
                });
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        optionsSuccessStatus: 200
    };
};

// Password/sensitive data detection in logs
export const sensitiveDataFilter = (data: any): any => {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    const filterObject = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        const filtered: any = Array.isArray(obj) ? [] : {};
        
        for (const key in obj) {
            const lowerKey = key.toLowerCase();
            const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
            
            if (isSensitive) {
                filtered[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object') {
                filtered[key] = filterObject(obj[key]);
            } else {
                filtered[key] = obj[key];
            }
        }
        
        return filtered;
    };
    
    return filterObject(data);
};

// Export security statistics
export const getSecurityStats = () => {
    const totalClients = suspiciousActivityTracker.size;
    let suspiciousClients = 0;
    let totalRequests = 0;
    let totalErrors = 0;

    for (const [, activity] of suspiciousActivityTracker) {
        if (activity.suspicious) suspiciousClients++;
        totalRequests += activity.requests;
        totalErrors += activity.errors;
    }

    return {
        totalClients,
        suspiciousClients,
        totalRequests,
        totalErrors,
        errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 100) : 0
    };
};