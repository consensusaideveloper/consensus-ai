import express from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/database';
import { database, isFirebaseInitialized } from '../lib/firebase-admin';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import rateLimit from 'express-rate-limit';
import { PLAN_TYPES } from '../constants/planTypes';

const router = express.Router();

// 入力検証スキーマ
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  category: z.enum(['technical', 'billing', 'feature', 'other']),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000)
});

// レート制限設定
const contactRateLimit = rateLimit({
  windowMs: parseInt(process.env.CONTACT_RATE_LIMIT_WINDOW_MS || '900000'), // 15分
  max: parseInt(process.env.CONTACT_RATE_LIMIT_REQUESTS || '5'), // 最大5回
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many contact requests. Please try again later.',
    details: 'Rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 環境変数チェック
const requiredEnvVars = [
  'CONTACT_RECIPIENT_EMAIL',
  'GMAIL_USER', 
  'GMAIL_APP_PASSWORD'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.warn(`[Contact API] Missing environment variables: ${missingEnvVars.join(', ')}`);
}

// Nodemailer設定
const createTransporter = () => {
  if (missingEnvVars.length > 0) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

// 優先度自動判定
const getPriority = (category: string): string => {
  const priorityRules: Record<string, string> = {
    billing: 'high',      // 課金関連は高優先度
    technical: 'normal',  // 技術問題は通常優先度
    feature: 'low',       // 機能要望は低優先度
    other: 'normal'       // その他は通常優先度
  };
  return priorityRules[category] || 'normal';
};

// ブラウザ情報取得
const getBrowserInfo = (req: express.Request): string => {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const referer = req.headers.referer || '';
  
  return JSON.stringify({
    userAgent,
    acceptLanguage,
    referer,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
};

// お問い合わせフォーム送信API
router.post('/', contactRateLimit, async (req, res, next) => {
  console.log('[Contact API] 📧 お問い合わせリクエスト受信:', {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  try {
    // 機能が無効化されている場合
    if (process.env.CONTACT_ENABLED !== 'true') {
      return next(new AppError(503, 'SERVICE_UNAVAILABLE', 'Contact form is currently disabled'));
    }

    // 入力検証
    const validationResult = contactSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('[Contact API] ❌ バリデーションエラー:', validationResult.error.issues);
      return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid form data', validationResult.error.issues));
    }

    const { name, email, category, subject, message } = validationResult.data;

    // ユーザー情報の取得（オプショナル）
    let userId: string | null = null;
    let userPlan: string | null = null;
    let projectCount: number | null = null;

    // Authorization ヘッダーまたは x-user-id ヘッダーからユーザーID取得を試行
    const authHeader = req.headers.authorization;
    const userIdHeader = req.headers['x-user-id'] as string;
    
    if (userIdHeader) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userIdHeader },
          include: {
            projects: {
              select: { id: true }
            }
          }
        });
        
        if (user) {
          userId = user.id;
          userPlan = user.subscriptionStatus || PLAN_TYPES.FREE;
          projectCount = user.projects.length;
          console.log('[Contact API] 👤 ユーザー情報取得成功:', { userId, userPlan, projectCount });
        }
      } catch (error) {
        console.warn('[Contact API] ⚠️ ユーザー情報取得失敗:', error);
        // ユーザー情報取得失敗は致命的エラーではないので続行
      }
    }

    // 優先度判定
    const priority = getPriority(category);
    
    // ブラウザ情報取得
    const browserInfo = getBrowserInfo(req);

    // SQLite Database への保存
    let contact;
    try {
      contact = await prisma.contact.create({
        data: {
          userId,
          name,
          email,
          category,
          subject,
          message,
          priority,
          userAgent: req.headers['user-agent'] || null,
          browserInfo,
          userPlan,
          projectCount,
          status: 'open',
          syncStatus: 'pending'
        }
      });
      console.log('[Contact API] ✅ SQLite保存成功:', { contactId: contact.id });
    } catch (error) {
      console.error('[Contact API] ❌ SQLite保存エラー:', error);
      return next(new AppError(500, 'DATABASE_ERROR', 'Failed to save contact information'));
    }

    // Firebase Realtime Database への同期
    console.log('[Contact API] 🔍 Firebase状況確認:', { 
      isFirebaseInitialized, 
      hasDatabaseInstance: !!database,
      contactId: contact.id 
    });
    
    if (isFirebaseInitialized && database) {
      try {
        // Firebaseに送信するデータを準備（undefined/null値をフィルタリング）
        const firebaseData: Record<string, any> = {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          category: contact.category,
          subject: contact.subject,
          message: contact.message,
          status: contact.status,
          priority: contact.priority,
          createdAt: contact.createdAt.toISOString(),
          updatedAt: contact.updatedAt.toISOString()
        };

        // null/undefined値のフィールドを除去
        if (contact.userId !== null && contact.userId !== undefined) {
          firebaseData.userId = contact.userId;
        }
        if (contact.userPlan !== null && contact.userPlan !== undefined) {
          firebaseData.userPlan = contact.userPlan;
        }
        if (contact.projectCount !== null && contact.projectCount !== undefined) {
          firebaseData.projectCount = contact.projectCount;
        }

        console.log('[Contact API] 🔄 Firebase書き込み開始:', { 
          contactId: contact.id, 
          firebaseDataKeys: Object.keys(firebaseData),
          hasUserId: 'userId' in firebaseData,
          hasUserPlan: 'userPlan' in firebaseData,
          hasProjectCount: 'projectCount' in firebaseData
        });

        const contactRef = database.ref(`contacts/${contact.id}`);
        await contactRef.set(firebaseData);

        // SQLiteの同期ステータス更新
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            firebaseId: contact.id,
            syncStatus: 'synced',
            lastSyncAt: new Date()
          }
        });

        console.log('[Contact API] ✅ Firebase同期成功:', { contactId: contact.id });
      } catch (error) {
        console.error('[Contact API] ⚠️ Firebase同期エラー:', error);
        // Firebase同期失敗は警告レベル（続行）
      }
    }

    // メール送信
    if (missingEnvVars.length === 0) {
      try {
        const transporter = createTransporter();
        if (transporter) {
          // 管理者向けメール
          const adminMailOptions = {
            from: `"${process.env.CONTACT_SENDER_NAME || 'ConsensusAI Support'}" <${process.env.GMAIL_USER}>`,
            to: process.env.CONTACT_RECIPIENT_EMAIL,
            subject: `[${priority.toUpperCase()}] [${category.toUpperCase()}] ${subject}`,
            html: `
              <h3>新しいお問い合わせが届きました</h3>
              <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                <p><strong>カテゴリ:</strong> ${category}</p>
                <p><strong>優先度:</strong> ${priority}</p>
                <p><strong>名前:</strong> ${name}</p>
                <p><strong>メールアドレス:</strong> ${email}</p>
                <p><strong>件名:</strong> ${subject}</p>
                <hr>
                <h4>メッセージ:</h4>
                <p style="white-space: pre-wrap;">${message}</p>
                <hr>
                <h4>ユーザー情報:</h4>
                <p><strong>ユーザーID:</strong> ${userId || '未ログイン'}</p>
                <p><strong>プラン:</strong> ${userPlan || '不明'}</p>
                <p><strong>プロジェクト数:</strong> ${projectCount || '不明'}</p>
                <p><strong>お問い合わせID:</strong> ${contact.id}</p>
                <p><strong>送信日時:</strong> ${contact.createdAt.toLocaleString('ja-JP')}</p>
              </div>
            `
          };

          // ユーザー向け自動返信メール
          const userMailOptions = {
            from: `"${process.env.CONTACT_SENDER_NAME || 'ConsensusAI Support'}" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: `お問い合わせを受け付けました - ${subject}`,
            html: `
              <h3>${name} 様</h3>
              <p>この度は ConsensusAI へお問い合わせいただき、ありがとうございます。</p>
              <p>以下の内容でお問い合わせを受け付けいたしました。</p>
              
              <div style="border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; background-color: #f9f9f9;">
                <p><strong>お問い合わせID:</strong> ${contact.id}</p>
                <p><strong>カテゴリ:</strong> ${category}</p>
                <p><strong>件名:</strong> ${subject}</p>
                <p><strong>受付日時:</strong> ${contact.createdAt.toLocaleString('ja-JP')}</p>
              </div>
              
              <p>内容を確認の上、担当者より ${priority === 'high' ? '24時間以内' : priority === 'normal' ? '48時間以内' : '72時間以内'} にご回答いたします。</p>
              <p>お急ぎの場合や追加のご質問がございましたら、このメールにご返信ください。</p>
              
              <hr>
              <p>ConsensusAI サポートチーム<br>
              Email: ${process.env.CONTACT_RECIPIENT_EMAIL}</p>
            `
          };

          // 両方のメールを送信
          await Promise.all([
            transporter.sendMail(adminMailOptions),
            transporter.sendMail(userMailOptions)
          ]);

          console.log('[Contact API] ✅ メール送信成功:', { 
            contactId: contact.id,
            adminEmail: process.env.CONTACT_RECIPIENT_EMAIL,
            userEmail: email
          });
        }
      } catch (error) {
        console.error('[Contact API] ⚠️ メール送信エラー:', error);
        // メール送信失敗は警告レベル（お問い合わせは保存済み）
      }
    } else {
      console.warn('[Contact API] ⚠️ メール設定不完全のため送信スキップ');
    }

    // 成功レスポンス
    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully',
      data: {
        id: contact.id,
        status: contact.status,
        priority: contact.priority,
        createdAt: contact.createdAt
      }
    });

    console.log('[Contact API] ✅ お問い合わせ処理完了:', { contactId: contact.id });

  } catch (error) {
    console.error('[Contact API] ❌ 予期しないエラー:', error);
    next(error);
  }
});

// お問い合わせ一覧取得API（管理者用）
router.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    // 管理者権限チェック（必要に応じて実装）
    const { page = '1', category, status, priority } = req.query;
    const limit = 20;
    const offset = (parseInt(page as string) - 1) * limit;

    // フィルター条件構築
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              subscriptionStatus: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: offset,
        take: limit
      }),
      prisma.contact.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          page: parseInt(page as string),
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('[Contact API] ❌ 一覧取得エラー:', error);
    next(error);
  }
});

export { router as contactRouter };