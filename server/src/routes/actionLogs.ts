import express from 'express';
import { Request, Response } from 'express';
import { ActionLogService, CreateActionLogRequest, UpdateActionLogRequest } from '../services/actionLogService.db';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();
const actionLogService = new ActionLogService();

/**
 * GET /api/db/projects/:projectId/opinions/:opinionId/action-logs
 * 指定された意見のアクションログを取得
 */
router.get('/projects/:projectId/opinions/:opinionId/action-logs', async (req: Request, res: Response) => {
  try {
    const { projectId, opinionId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({
        error: 'User ID is required',
        code: 'UNAUTHORIZED'
      });
    }

    const actionLogs = await actionLogService.getActionLogs(userId, projectId, opinionId);

    res.json({
      actionLogs,
      total: actionLogs.length
    });
  } catch (error) {
    console.error('[ActionLogs API] Get action logs error:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/db/projects/:projectId/opinions/:opinionId/action-logs
 * 新しいアクションログを作成
 */
router.post('/projects/:projectId/opinions/:opinionId/action-logs', async (req: Request, res: Response) => {
  try {
    const { projectId, opinionId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({
        error: 'User ID is required',
        code: 'UNAUTHORIZED'
      });
    }

    const { type, content, author, authorId, metadata } = req.body;

    // バリデーション
    if (!type || !content || !author) {
      return res.status(400).json({
        error: 'Type, content, and author are required',
        code: 'INVALID_REQUEST'
      });
    }

    const validTypes = ['comment', 'status_change', 'priority_change', 'dependency_change'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Type must be one of: ${validTypes.join(', ')}`,
        code: 'INVALID_REQUEST'
      });
    }

    const createData: CreateActionLogRequest = {
      opinionId,
      type,
      content,
      author,
      authorId,
      metadata
    };

    const actionLog = await actionLogService.createActionLog(userId, projectId, createData);

    res.status(201).json(actionLog);
  } catch (error) {
    console.error('[ActionLogs API] Create action log error:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PUT /api/db/projects/:projectId/opinions/:opinionId/action-logs/:logId
 * 指定されたアクションログを更新
 */
router.put('/projects/:projectId/opinions/:opinionId/action-logs/:logId', async (req: Request, res: Response) => {
  try {
    const { projectId, logId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({
        error: 'User ID is required',
        code: 'UNAUTHORIZED'
      });
    }

    const { content, metadata } = req.body;

    const updateData: UpdateActionLogRequest = {};
    
    if (content !== undefined) {
      updateData.content = content;
    }
    
    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    const actionLog = await actionLogService.updateActionLog(userId, projectId, logId, updateData);

    res.json(actionLog);
  } catch (error) {
    console.error('[ActionLogs API] Update action log error:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * DELETE /api/db/projects/:projectId/opinions/:opinionId/action-logs/:logId
 * 指定されたアクションログを削除
 */
router.delete('/projects/:projectId/opinions/:opinionId/action-logs/:logId', async (req: Request, res: Response) => {
  try {
    const { projectId, logId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({
        error: 'User ID is required',
        code: 'UNAUTHORIZED'
      });
    }

    await actionLogService.deleteActionLog(userId, projectId, logId);

    res.status(204).send();
  } catch (error) {
    console.error('[ActionLogs API] Delete action log error:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/db/actions/dashboard-stats
 * ダッシュボード統計情報を取得
 */
router.get('/actions/dashboard-stats', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    console.log('[Dashboard Stats API] Received request for userId:', userId);

    if (!userId) {
      return res.status(401).json({
        error: 'User ID is required',
        code: 'UNAUTHORIZED'
      });
    }

    // ユーザーのプロジェクト数を取得
    const totalProjects = await actionLogService.getTotalProjectsCount(userId);
    console.log('[Dashboard Stats API] Total projects:', totalProjects);
    
    // アクティブなプロジェクト数を取得（ステータスがactiveのもの）
    const activeProjects = await actionLogService.getActiveProjectsCount(userId);
    console.log('[Dashboard Stats API] Active projects:', activeProjects);
    
    // 未対応アクション数を取得（全プロジェクト合計）
    const pendingActions = await actionLogService.getPendingActionsCount(userId);
    console.log('[Dashboard Stats API] Pending actions:', pendingActions);
    
    // ステータス別アクション数を取得
    const statusBreakdown = await actionLogService.getActionStatusBreakdown(userId);
    console.log('[Dashboard Stats API] Status breakdown:', statusBreakdown);

    const response = {
      totalProjects,
      activeProjects,
      pendingActions,
      unhandledActions: statusBreakdown.unhandled,
      inProgressActions: statusBreakdown.inProgress
    };
    console.log('[Dashboard Stats API] Sending response:', response);
    
    res.json(response);
  } catch (error) {
    console.error('[ActionLogs API] Get dashboard stats error:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;