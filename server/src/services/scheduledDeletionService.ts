import * as cron from 'node-cron';
import { AccountDeletionService } from './accountDeletionService';

export class ScheduledDeletionService {
  private cronJob: cron.ScheduledTask | null = null;
  private accountDeletionService: AccountDeletionService;

  constructor() {
    this.accountDeletionService = new AccountDeletionService();
  }

  /**
   * 定期削除ジョブを開始
   * 毎日午前3時に実行（サーバー負荷が低い時間帯）
   */
  public startScheduledDeletion(): void {
    // 既に開始済みの場合は重複起動を防ぐ
    if (this.cronJob) {
      console.log('[ScheduledDeletion] ⚠️ 削除ジョブは既に実行中です');
      return;
    }

    // 毎日午前3時に実行 (0 3 * * *)
    this.cronJob = cron.schedule('0 3 * * *', async () => {
      console.log('[ScheduledDeletion] 🕐 定期削除ジョブ開始:', new Date().toISOString());
      
      try {
        await this.processScheduledDeletions();
      } catch (error) {
        console.error('[ScheduledDeletion] ❌ 定期削除ジョブエラー:', error);
      }
    }, {
      timezone: 'Asia/Tokyo'
    });

    console.log('[ScheduledDeletion] ✅ 定期削除ジョブが開始されました (毎日午前3時実行)');
  }

  /**
   * 定期削除ジョブを停止
   */
  public stopScheduledDeletion(): void {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
      console.log('[ScheduledDeletion] 🛑 定期削除ジョブが停止されました');
    }
  }

  /**
   * 削除予定のアカウントを処理
   */
  private async processScheduledDeletions(): Promise<void> {
    try {
      // 削除予定のアカウントを取得
      const scheduledDeletions = await this.accountDeletionService.getScheduledDeletions();
      
      console.log('[ScheduledDeletion] 📋 削除予定アカウント数:', scheduledDeletions.length);

      if (scheduledDeletions.length === 0) {
        console.log('[ScheduledDeletion] ℹ️ 削除予定のアカウントはありません');
        return;
      }

      // 各アカウントを削除
      let successCount = 0;
      let errorCount = 0;

      for (const deletion of scheduledDeletions) {
        try {
          console.log('[ScheduledDeletion] 🗑️ アカウント削除開始:', {
            userId: deletion.userId,
            scheduledDeletionAt: deletion.scheduledDeletionAt
          });

          const result = await this.accountDeletionService.executeAccountDeletion(deletion.userId);
          successCount++;

          console.log('[ScheduledDeletion] ✅ アカウント削除完了:', {
            userId: deletion.userId,
            deletedData: result.deletedData
          });

        } catch (error) {
          errorCount++;
          console.error('[ScheduledDeletion] ❌ アカウント削除失敗:', {
            userId: deletion.userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log('[ScheduledDeletion] 📊 定期削除ジョブ完了:', {
        総件数: scheduledDeletions.length,
        成功: successCount,
        失敗: errorCount,
        完了時刻: new Date().toISOString()
      });

    } catch (error) {
      console.error('[ScheduledDeletion] ❌ 定期削除処理エラー:', error);
      throw error;
    }
  }

  /**
   * 手動で削除処理を実行（テスト用）
   */
  public async runManualDeletion(): Promise<void> {
    console.log('[ScheduledDeletion] 🔧 手動削除実行開始');
    await this.processScheduledDeletions();
  }

  /**
   * ジョブの実行状態を取得
   */
  public getJobStatus(): { isRunning: boolean; nextExecution?: Date } {
    return {
      isRunning: this.cronJob !== null,
      nextExecution: this.cronJob ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined // 次回実行時間（概算）
    };
  }
}