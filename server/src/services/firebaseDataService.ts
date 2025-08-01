import { adminDatabase, isFirebaseInitialized } from '../lib/firebase-admin';
import { AppError } from '../middleware/errorHandler';

export interface FirebaseProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  collectionMethod: string;
  createdAt: string;
  updatedAt: string;
  opinionsCount?: number; // 廃止予定フィールド（既存データとの互換性のため一時的に保持）
  isCompleted: boolean;
  isAnalyzed?: boolean;
  lastAnalysisAt?: string;
  lastAnalyzedOpinionsCount?: number;
  userId: string;
}

export interface FirebaseOpinion {
  id: string;
  content: string;
  submittedAt: string;
  isBookmarked: boolean;
  sentiment: string;
  characterCount: number;
}

export class FirebaseDataService {
  
  async getProject(projectId: string, userId?: string): Promise<FirebaseProject | null> {
    console.log('[FirebaseData] 🔍 プロジェクト取得開始', {
      projectId,
      userId,
      timestamp: new Date().toISOString()
    });

    try {
      // Firebase接続状況をチェック
      if (!isFirebaseInitialized || !adminDatabase) {
        console.log('[FirebaseData] ❌ Firebase未初期化');
        throw new AppError(500, 'FIREBASE_ERROR', 'Firebase is not initialized');
      }
      
      console.log('[FirebaseData] 📡 Firebaseからプロジェクトデータを取得中...');
      
      // Firebaseから実際のプロジェクトデータを取得（タイムアウト設定）
      if (userId) {
        const projectRef = adminDatabase.ref(`users/${userId}/projects/${projectId}`);
        
        // タイムアウト付きでFirebase接続を試行
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Firebase timeout')), 5000);
        });
        
        const snapshot = await Promise.race([
          projectRef.once('value'),
          timeoutPromise
        ]) as any;
        
        if (snapshot.exists()) {
          const projectData = snapshot.val();
          const result = {
            id: projectId,
            name: projectData.name || 'Untitled Project',
            description: projectData.description || '',
            status: projectData.status || 'active',
            collectionMethod: projectData.collectionMethod || 'form',
            createdAt: projectData.createdAt || new Date().toISOString(),
            updatedAt: projectData.updatedAt || new Date().toISOString(),
            opinionsCount: projectData.opinionsCount || 0,
            isCompleted: projectData.isCompleted || false,
            isAnalyzed: projectData.isAnalyzed || false,
            lastAnalysisAt: projectData.lastAnalysisAt || null,
            lastAnalyzedOpinionsCount: projectData.lastAnalyzedOpinionsCount || null,
            userId: userId
          };
          
          console.log('[FirebaseData] ✅ Firebaseプロジェクト取得成功', {
            projectId,
            name: result.name,
            opinionsCount: result.opinionsCount
          });
          
          return result;
        }
      }
      
      console.log('[FirebaseData] ❌ プロジェクトが見つかりません');
      return null;
    } catch (error) {
      console.error('[FirebaseData] ❌ プロジェクト取得エラー', {
        projectId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // エラーの場合はエラーを投げる
      throw new AppError(500, 'FIREBASE_ERROR', 'Failed to get project from Firebase');
    }
  }

  async getOpinions(projectId: string, userId: string): Promise<FirebaseOpinion[]> {
    console.log('[FirebaseData] 🔍 意見取得開始', {
      projectId,
      userId,
      timestamp: new Date().toISOString()
    });

    try {
      // Firebase接続状況をチェック
      if (!isFirebaseInitialized || !adminDatabase) {
        console.log('[FirebaseData] ❌ Firebase未初期化 - 認証設定が必要です');
        throw new AppError(500, 'FIREBASE_ERROR', 'Firebase is not initialized - authentication required');
      }
      
      console.log('[FirebaseData] 📡 Firebaseから意見データを取得中...');
      
      // Firebaseから実際の意見データを取得（タイムアウト設定）
      const opinionsRef = adminDatabase.ref(`users/${userId}/projects/${projectId}/opinions`);
      
      // タイムアウト付きでFirebase接続を試行（開発環境では短縮）
      const timeoutMs = process.env.NODE_ENV === 'development' ? 3000 : 10000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firebase timeout')), timeoutMs);
      });
      
      const snapshot = await Promise.race([
        opinionsRef.once('value'),
        timeoutPromise
      ]) as any;
      
      if (snapshot.exists()) {
        const opinionsData = snapshot.val();
        const opinions: FirebaseOpinion[] = Object.entries(opinionsData).map(([id, data]: [string, any]) => ({
          id,
          content: data.content || '',
          submittedAt: data.submittedAt || new Date().toISOString(),
          isBookmarked: data.isBookmarked || false,
          sentiment: data.sentiment || 'neutral',
          characterCount: data.characterCount || data.content?.length || 0
        }));
        
        console.log('[FirebaseData] ✅ Firebase意見データ取得成功', {
          projectId,
          userId,
          opinionsCount: opinions.length
        });
        
        if (opinions.length > 0) {
          return opinions;
        }
      }
      
      console.log('[FirebaseData] ⚠️ Firebaseで意見が見つかりません');
      return [];
    } catch (error) {
      console.error('[FirebaseData] ❌ 意見取得エラー', {
        projectId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError(500, 'FIREBASE_ERROR', 'Failed to get opinions from Firebase');
    }
  }


  async updateProject(userId: string, projectId: string, updateData: {
    lastAnalyzedOpinionsCount?: number;
    lastAnalysisAt?: string;
    isAnalyzed?: boolean;
    [key: string]: any;
  }): Promise<void> {
    console.log('[FirebaseData] 📝 プロジェクト更新開始', {
      projectId,
      userId,
      updateData,
      timestamp: new Date().toISOString()
    });

    try {
      // Firebase接続状況をチェック
      if (!isFirebaseInitialized || !adminDatabase) {
        console.log('[FirebaseData] ❌ Firebase未初期化');
        throw new AppError(500, 'FIREBASE_ERROR', 'Firebase is not initialized');
      }

      const projectRef = adminDatabase.ref(`users/${userId}/projects/${projectId}`);
      
      // タイムアウト付きでFirebase更新を実行
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firebase update timeout')), 5000);
      });

      await Promise.race([
        projectRef.update({
          ...updateData,
          updatedAt: new Date().toISOString()
        }),
        timeoutPromise
      ]);

      console.log('[FirebaseData] ✅ Firebase プロジェクト更新成功', {
        projectId,
        userId,
        updatedFields: Object.keys(updateData)
      });

    } catch (error) {
      console.error('[FirebaseData] ❌ プロジェクト更新エラー', {
        projectId,
        userId,
        updateData,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError(500, 'FIREBASE_UPDATE_ERROR', 'Failed to update project in Firebase');
    }
  }

  async validateUserAccess(projectId: string, userId: string): Promise<boolean> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        return false;
      }

      // 現在は簡単な検証のみ（実際のプロジェクトオーナー検証は必要に応じて追加）
      return true;
    } catch (error) {
      console.error('[FirebaseData] ❌ ユーザーアクセス検証エラー', {
        projectId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}