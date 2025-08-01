import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

export class AppError extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        message: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    // プラン制限エラーは通常のフローなので詳細ログは出力しない
    if (err instanceof AppError && (
        err.code === 'PROJECT_LIMIT_EXCEEDED' || 
        err.code === 'ANALYSIS_LIMIT_EXCEEDED'
    )) {
        const errorResponse: ErrorResponse = {
            error: err.message,
            code: err.code,
            details: err.details,
        };
        return res.status(err.statusCode).json(errorResponse);
    }

    console.error('❌ [ErrorHandler] エラー発生:', {
        method: req.method,
        url: req.url,
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
    });

    if (err instanceof AppError) {
        console.error('❌ [ErrorHandler] AppError詳細:', {
            statusCode: err.statusCode,
            code: err.code,
            message: err.message,
            details: err.details
        });
        
        const errorResponse: ErrorResponse = {
            error: err.message,
            code: err.code,
            details: err.details,
        };
        return res.status(err.statusCode).json(errorResponse);
    }

    // Default error
    console.error('❌ [ErrorHandler] 未処理エラー:', {
        name: err.name,
        message: err.message,
        stack: err.stack
    });
    
    const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
    };
    return res.status(500).json(errorResponse);
}; 