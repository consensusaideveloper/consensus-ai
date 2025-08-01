// Jest セットアップファイル
// テスト実行前の共通設定

// 環境変数設定
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';

// コンソールログを制御（テスト時は最小限に）
const originalLog = console.log;
const originalError = console.error;

global.console = {
  ...console,
  log: jest.fn((message) => {
    // テスト関連のログのみ表示
    if (typeof message === 'string' && message.includes('[TEST]')) {
      originalLog(message);
    }
  }),
  error: jest.fn((message) => {
    // エラーは常に表示
    originalError(message);
  })
};

// グローバルモック設定
global.fetch = jest.fn();

// テスト後のクリーンアップ
afterEach(() => {
  jest.clearAllMocks();
});