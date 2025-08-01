import { useState, useEffect } from 'react';

/**
 * useDebounce - 値の変更を遅延させるカスタムフック
 * 
 * @param value - デバウンスしたい値
 * @param delay - 遅延時間（ミリ秒）
 * @returns デバウンスされた値
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 値が変更されたらタイマーを設定
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // cleanup: 次の値変更や unmount 時にタイマーをクリア
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useSearchDebounce - 検索特化のデバウンスフック
 * 検索用に最適化されたデフォルト設定付き
 * 
 * @param searchTerm - 検索語句
 * @param delay - 遅延時間（デフォルト: 300ms）
 * @returns デバウンスされた検索語句
 */
export function useSearchDebounce(searchTerm: string, delay: number = 300): string {
  return useDebounce(searchTerm, delay);
}