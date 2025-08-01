import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { AppError } from './errorHandler';
import { prisma } from '../lib/database';

/**
 * Archive Protection Middleware
 * アーカイブされたプロジェクトへの書き込み操作を防止するミドルウェア
 * 
 * 既存の認証・認可パターンに従い、最小影響で実装
 */
export const requireActiveProject = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        // プロジェクトIDを取得（複数のパラメータ名に対応）
        const projectId = req.params.id || req.params.projectId;
        
        // プロジェクトIDが存在しない場合はスキップ（他のバリデーションに委ねる）
        if (!projectId) {
            return next();
        }

        console.log('[ArchiveProtection] 🔍 アーカイブ状態チェック開始:', {
            projectId,
            userId: req.userId,
            method: req.method,
            path: req.path
        });

        // プロジェクトの存在とアーカイブ状態を確認
        // Firebase ID（-で始まる）とSQLite ID両方に対応
        let project;
        if (projectId.startsWith('-')) {
            project = await prisma.project.findFirst({
                where: { 
                    firebaseId: projectId,
                    userId: req.userId 
                },
                select: { 
                    id: true,
                    name: true,
                    isArchived: true 
                }
            });
        } else {
            project = await prisma.project.findFirst({
                where: { 
                    id: projectId,
                    userId: req.userId 
                },
                select: { 
                    id: true,
                    name: true,
                    isArchived: true 
                }
            });
        }

        // プロジェクトが見つからない場合は他のミドルウェアに委ねる
        if (!project) {
            console.log('[ArchiveProtection] ⚠️ プロジェクトが見つからない:', projectId);
            return next();
        }

        // アーカイブされている場合は書き込み操作を拒否
        if (project.isArchived) {
            console.log('[ArchiveProtection] ❌ アーカイブプロジェクトへの書き込み操作を拒否:', {
                projectId: project.id,
                projectName: project.name,
                operation: `${req.method} ${req.path}`
            });

            throw new AppError(
                403,
                'PROJECT_ARCHIVED',
                'Cannot modify archived project. Please unarchive to make changes.',
                { 
                    projectId: project.id,
                    projectName: project.name,
                    action: 'unarchive_required'
                }
            );
        }

        console.log('[ArchiveProtection] ✅ アクティブプロジェクト確認完了:', {
            projectId: project.id,
            projectName: project.name
        });

        next();
    } catch (error) {
        // AppErrorの場合はそのまま次のエラーハンドラーに渡す
        if (error instanceof AppError) {
            next(error);
        } else {
            // その他のエラーは内部エラーとして処理
            console.error('[ArchiveProtection] ❌ アーカイブ保護ミドルウェアエラー:', error);
            next(new AppError(
                500,
                'ARCHIVE_CHECK_ERROR',
                'Failed to check project archive status',
                error
            ));
        }
    }
};

/**
 * 公開API用のアーカイブ保護ミドルウェア
 * 認証なしでプロジェクトIDとユーザーIDを使用してチェック
 */
export const requireActiveProjectPublic = async (
    req: any, // 公開APIでは AuthenticatedRequest ではない
    res: Response,
    next: NextFunction
) => {
    try {
        const projectId = req.params.projectId;
        const userId = req.params.userId;

        if (!projectId || !userId) {
            return next();
        }

        console.log('[ArchiveProtection] 🔍 公開API用アーカイブ状態チェック:', {
            projectId,
            userId
        });

        // 公開APIではFirebase IDかSQLite IDかを判別してプロジェクトを取得
        let project;
        if (projectId.startsWith('-')) {
            project = await prisma.project.findFirst({
                where: { 
                    firebaseId: projectId,
                    userId: userId 
                },
                select: { 
                    id: true,
                    name: true,
                    isArchived: true,
                    status: true
                }
            });
        } else {
            project = await prisma.project.findFirst({
                where: { 
                    id: projectId,
                    userId: userId 
                },
                select: { 
                    id: true,
                    name: true,
                    isArchived: true,
                    status: true
                }
            });
        }

        if (!project) {
            console.log('[ArchiveProtection] ⚠️ 公開API: プロジェクトが見つからない:', projectId);
            return next();
        }

        if (project.isArchived) {
            console.log('[ArchiveProtection] ❌ 公開API: アーカイブプロジェクトへのアクセス拒否:', {
                projectId: project.id,
                projectName: project.name
            });

            return res.status(403).json({
                error: 'PROJECT_ARCHIVED',
                message: 'This project is archived and no longer accepting opinions.',
                projectName: project.name,
                action: 'contact_owner'
            });
        }

        console.log('[ArchiveProtection] ✅ 公開API: アクティブプロジェクト確認完了:', {
            projectId: project.id,
            projectName: project.name
        });

        next();
    } catch (error) {
        console.error('[ArchiveProtection] ❌ 公開API用アーカイブ保護エラー:', error);
        res.status(500).json({
            error: 'ARCHIVE_CHECK_ERROR',
            message: 'Failed to check project archive status'
        });
    }
};