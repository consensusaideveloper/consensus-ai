import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Language, translations } from "../translations";
import { AuthContext } from "./AuthContext";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, unknown> | string) => string;
  tNested: (path: string) => string;
  forceSync: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

function LanguageProvider({ children }: { children: ReactNode }) {
  const authContext = useContext(AuthContext);

  // 言語設定の永続化（ユーザーログイン時はプロファイルから、未ログイン時はローカルストレージから）
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem(
      "consensusai_language"
    ) as Language;
    const browserLanguage = navigator.language.startsWith("ja") ? "ja" : "en";
    return savedLanguage || browserLanguage || "ja";
  });

  // ユーザーログイン時に言語設定を復元
  useEffect(() => {
    if (authContext?.user?.language) {
      setLanguageState(authContext.user.language);
    }
  }, [authContext?.user?.language, language]);

  // ユーザー認証状態変更時の言語同期（画面遷移対応）
  useEffect(() => {
    if (authContext?.user?.language && language !== authContext.user.language) {
      setLanguageState(authContext.user.language);
    }
  }, [authContext?.user, authContext?.isAuthenticated, language]);

  // 言語変更時の処理
  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);

    // ローカルストレージに保存（未ログイン時やバックアップ用）
    localStorage.setItem("consensusai_language", lang);

    // ユーザーがログイン済みの場合はプロファイルも更新
    if (authContext?.user && authContext?.updateUserLanguage) {
      try {
        await authContext.updateUserLanguage(lang);
      } catch {
        // エラーが発生してもUIの言語変更は継続
      }
    }
  };

  // 翻訳関数（パラメータ補間対応）
  const t = (key: string, params?: Record<string, unknown> | string): string => {
    const keys = key.split(".");
    let value: unknown = translations[language];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = undefined;
        break;
      }
    }

    let result = (
      typeof value === "string"
        ? value
        : typeof params === "string"
        ? params
        : key
    ) as string;

    // パラメータ補間処理
    if (typeof params === "object" && params !== null) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        const placeholder = `{${paramKey}}`;
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          String(paramValue)
        );
      });
    }

    return result;
  };

  // ネストされたパス用翻訳関数
  const tNested = (path: string): string => {
    const result = path.split(".").reduce((obj: unknown, key) => {
      if (obj && typeof obj === "object" && key in obj) {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, translations[language]);
    return typeof result === "string" ? result : path;
  };

  // 手動同期機能（緊急時の言語設定復元用）
  const forceSync = () => {
    if (authContext?.user?.language && language !== authContext.user.language) {
      setLanguageState(authContext.user.language);
    } else if (!authContext?.user) {
      const savedLanguage = localStorage.getItem(
        "consensusai_language"
      ) as Language;
      if (savedLanguage && language !== savedLanguage) {
        setLanguageState(savedLanguage);
      }
    }
  };

  return (
    <LanguageContext.Provider
      value={{ language: language, setLanguage, t, tNested, forceSync }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export { LanguageContext, LanguageProvider };
