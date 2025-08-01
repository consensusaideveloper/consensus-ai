import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../lib/firebase';
import { useAuth } from './useAuth';

/**
 * プロジェクトの意見数をFirebaseからリアルタイムで取得するカスタムフック
 * プロジェクト詳細画面専用 - CLAUDE.mdルール対応
 */
export function useOpinionsRealtime(projectId?: string) {
  const { user } = useAuth();
  const [opinionsCount, setOpinionsCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !database || !user?.id) {
      setOpinionsCount(0);
      setIsConnected(false);
      return;
    }

    // Firebaseから意見数を取得（リアルタイム反映）
    // 正しいパス: users/{userId}/projects/{projectId}/opinions
    const opinionsRef = ref(database, `users/${user.id}/projects/${projectId}/opinions`);
    
    const unsubscribe = onValue(
      opinionsRef,
      (snapshot) => {
        try {
          const opinionsData = snapshot.val();
          
          if (opinionsData && typeof opinionsData === 'object') {
            // 意見データの件数を計算
            const count = Object.keys(opinionsData).length;
            setOpinionsCount(count);
          } else {
            setOpinionsCount(0);
          }
          
          setIsConnected(true);
          setError(null);
        } catch (err) {
          console.error('[useOpinionsRealtime] 意見数処理エラー:', err);
          setError('意見数の取得中にエラーが発生しました');
        }
      },
      (err) => {
        console.error('[useOpinionsRealtime] Firebase接続エラー:', err);
        setError('Firebase接続エラーが発生しました');
        setIsConnected(false);
      }
    );

    return () => {
      off(opinionsRef, 'value', unsubscribe);
    };
  }, [projectId, user?.id]);

  return {
    opinionsCount,
    isConnected,
    error,
    // フォールバック用: Firebase接続失敗時はSQLの値を使用可能
    isFirebaseAvailable: isConnected && !error
  };
}