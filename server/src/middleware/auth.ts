import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { prisma } from '../lib/database';
import { TrialService } from '../services/trialService';

export interface AuthenticatedRequest extends Request {
    userId?: string;
    user?: {
        id: string;
        email: string;
        name?: string;
        purpose?: string;
    };
}

// Simple authentication middleware - in production, this should validate JWT tokens
export const requireAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        // For development, we'll use a header-based approach
        // In production, this should validate JWT tokens from Authorization header
        const userId = req.headers['x-user-id'] as string;
        
        console.log('[Auth] 🔍 Authentication attempt:', {
            method: req.method,
            path: req.path,
            userId: userId,
            hasUserId: !!userId,
            allHeaders: Object.keys(req.headers)
        });
        
        if (!userId || userId === 'anonymous') {
            console.log('[Auth] ❌ Missing or anonymous user ID header:', userId);
            throw new AppError(
                401,
                'AUTHENTICATION_REQUIRED',
                'Authentication required'
            );
        }

        // 匿名ユーザーの場合はデータベース処理をスキップ
        let user;
        if (userId.startsWith('anonymous-')) {
            user = {
                id: userId,
                email: `${userId}@anonymous.local`,
                name: 'Anonymous User',
                purpose: null
            };
            console.log('[Auth] 👤 匿名ユーザーセッション:', userId);
        } else {
            console.log('[Auth] 🔍 Authenticating user:', userId);
            
            // Verify user exists in database
            user = await prisma.user.findUnique({
                where: { id: userId },
            });

            console.log('[Auth] 🔍 User lookup result:', {
                found: !!user,
                userId: user?.id,
                email: user?.email
            });

            if (!user) {
                console.log('[Auth] ⚠️ User not found in SQLite, auto-creating:', userId);
                
                // Auto-create user if they don't exist
                try {
                    user = await prisma.user.create({
                        data: {
                            id: userId,
                            email: `user-${userId}@example.com`,
                            name: 'Auto-created User'
                        }
                    });
                    
                    console.log('[Auth] ✅ User auto-created successfully:', userId);
                } catch (createError) {
                    console.error('[Auth] ❌ Failed to auto-create user:', createError);
                    throw new AppError(
                        500,
                        'USER_CREATION_FAILED',
                        'Failed to create user in database'
                    );
                }
            }
        }

        // Check and update expired trial status (only for non-anonymous users)
        if (!userId.startsWith('anonymous-')) {
            try {
                const trialCheck = await TrialService.checkAndUpdateExpiredTrial(user.id);
                if (trialCheck.updated && trialCheck.user) {
                    // Use updated user data if trial status was changed
                    user = trialCheck.user;
                    console.log('[Auth] ✅ トライアル期限切れチェック完了:', {
                        userId: user.id,
                        wasExpired: trialCheck.wasExpired,
                        updated: trialCheck.updated,
                        newStatus: user.subscriptionStatus
                    });
                }
            } catch (trialError) {
                console.warn('[Auth] ⚠️ トライアル期限切れチェックエラー（処理継続）:', trialError);
                // Trial check failure should not block authentication
            }
        }

        // Attach user info to request
        req.userId = user.id;
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            purpose: user.purpose || undefined,
        };

        next();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else {
            next(new AppError(
                500,
                'AUTHENTICATION_ERROR',
                'Authentication failed',
                error
            ));
        }
    }
};

// Optional authentication - doesn't fail if no user provided
export const optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        
        if (userId) {
            // User ID mapping for Firebase/SQLite synchronization issues
            const userIdMapping: Record<string, string> = {
                'o8zIkjvE1xRBuBtXxyzzwvp9YNc2': 'Bqm1nqPwL2f1PJx6JTVMdXG1Y9k1', // Old Firebase ID -> New SQLite ID
            };
            
            const mappedUserId = userIdMapping[userId] || userId;
            
            const user = await prisma.user.findUnique({
                where: { id: mappedUserId },
            });

            if (user) {
                req.userId = user.id;
                req.user = {
                    id: user.id,
                    email: user.email,
                    name: user.name || undefined,
                    purpose: user.purpose || undefined,
                };
            }
        }

        next();
    } catch (error) {
        // Don't fail on optional auth errors, just continue without user
        next();
    }
};