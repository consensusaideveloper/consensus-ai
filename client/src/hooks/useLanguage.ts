import { useContext, useEffect } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  // コンポーネントマウント時に言語同期を確認
  useEffect(() => {
    if (context.forceSync) {
      context.forceSync();
    }
  }, [context]);

  return context;
}