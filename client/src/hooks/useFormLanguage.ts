import { useState, useCallback, useEffect } from 'react';
import { Language } from '../translations';
import { publicOpinionFormTranslations } from '../translations/pages/publicOpinionForm';

interface FormLanguageHook {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
  isLoadingProjectLanguage: boolean;
}

export function useFormLanguage(projectId?: string, uid?: string): FormLanguageHook {
  // 意見フォーム専用の言語状態管理
  const [language, setLanguageState] = useState<Language>('ja'); // 初期値は仮設定
  const [isLoadingProjectLanguage, setIsLoadingProjectLanguage] = useState(false);
  
  // プロジェクト言語設定の取得
  useEffect(() => {
    const fetchProjectLanguageSettings = async () => {
      // プロジェクト情報がない場合は従来のロジック
      if (!projectId || !uid) {
        const savedFormLanguage = localStorage.getItem('consensusai_form_language') as Language;
        const browserLanguage = navigator.language.startsWith('ja') ? 'ja' : 'en';
        const selectedLanguage = savedFormLanguage || browserLanguage || 'ja';
        setLanguageState(selectedLanguage);
        return;
      }
      
      // プロジェクト固有の言語設定をチェック
      const projectSpecificKey = `consensusai_form_language_${projectId}`;
      const savedProjectLanguage = localStorage.getItem(projectSpecificKey) as Language;
      
      if (savedProjectLanguage) {
        // このプロジェクトで過去に手動選択した言語があれば、それを優先
        setLanguageState(savedProjectLanguage);
        console.log('[useFormLanguage] ✅ プロジェクト固有言語設定使用:', {
          projectId,
          savedLanguage: savedProjectLanguage
        });
        return;
      }
      
      // プロジェクトオーナーの分析言語設定を取得
      setIsLoadingProjectLanguage(true);
      try {
        const response = await fetch(`/api/public/projects/${projectId}/language-settings`);
        if (response.ok) {
          const data = await response.json();
          const ownerLanguage = data.ownerAnalysisLanguage || 'ja';
          setLanguageState(ownerLanguage);
          console.log('[useFormLanguage] ✅ プロジェクトオーナー言語設定取得:', {
            projectId,
            ownerAnalysisLanguage: ownerLanguage
          });
        } else {
          // API呼び出し失敗時は従来のフォールバック
          const browserLanguage = navigator.language.startsWith('ja') ? 'ja' : 'en';
          setLanguageState(browserLanguage || 'ja');
          console.log('[useFormLanguage] ⚠️ API呼び出し失敗、フォールバック:', response.status);
        }
      } catch (error) {
        console.error('[useFormLanguage] ❌ プロジェクト言語設定取得エラー:', error);
        // エラー時は従来のフォールバック
        const browserLanguage = navigator.language.startsWith('ja') ? 'ja' : 'en';
        setLanguageState(browserLanguage || 'ja');
      } finally {
        setIsLoadingProjectLanguage(false);
      }
    };
    
    fetchProjectLanguageSettings();
  }, [projectId, uid]);

  // 言語切り替え処理 - useCallbackでメモ化して参照の安定性を保つ
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    
    // プロジェクト固有のlocalStorageキーに保存
    if (projectId) {
      const projectSpecificKey = `consensusai_form_language_${projectId}`;
      localStorage.setItem(projectSpecificKey, lang);
      console.log('[useFormLanguage] ✅ プロジェクト固有言語設定保存:', {
        projectId,
        language: lang,
        key: projectSpecificKey
      });
    } else {
      // プロジェクトIDがない場合は従来のキーを使用
      localStorage.setItem('consensusai_form_language', lang);
    }
  }, [projectId]);

  // 翻訳関数（ネストされたパスに対応） - useCallbackでメモ化
  const t = useCallback((path: string): string => {
    const keys = path.split('.');
    let value: unknown = publicOpinionFormTranslations[language];
    
    for (const key of keys) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        value = (value as Record<string, unknown>)[key];
      } else {
        value = undefined;
        break;
      }
    }
    
    // 値が見つからない場合はパスをそのまま返す
    if (value === undefined) {
      return path;
    }
    
    return typeof value === 'string' ? value : path;
  }, [language]);

  return {
    language,
    setLanguage,
    t,
    isLoadingProjectLanguage
  };
}