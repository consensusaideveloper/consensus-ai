import { createContext, useState, useEffect, ReactNode } from "react";
import { auth } from "../lib/firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  purpose?: string;
  purposeSkipped?: boolean;
  language?: "ja" | "en";
  analysisLanguage?: "ja" | "en";
  // プラン関連フィールド（オプショナル - 既存コードに影響なし）
  subscriptionStatus?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  // 削除関連フィールド（既存の削除機能用）
  isDeleted?: boolean;
  scheduledDeletionAt?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserPurpose: (purpose: string) => Promise<void>;
  skipPurposeSelection: () => Promise<void>;
  updateUserLanguage: (language: "ja" | "en") => Promise<void>;
  updateUserAnalysisLanguage: (analysisLanguage: "ja" | "en") => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          try {

            // Get user data from SQL API
            let userData: User;
            
            try {
              
              const response = await fetch(`/api/users/${firebaseUser.uid}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
              });
              
              if (response.ok) {
                const result = await response.json();
                userData = result.user;

                // Googleアカウントの最新avatar情報を確認・更新
                const currentGoogleAvatar = firebaseUser.photoURL;
                if (
                  currentGoogleAvatar &&
                  userData.avatar !== currentGoogleAvatar
                ) {
                  userData.avatar = currentGoogleAvatar;
                  // 必要に応じて後でAPIで更新
                }

              } else if (response.status === 404) {
                // User not found, will create new user
                throw new Error('User not found');
              } else {
                // User fetch failed with unexpected status
                throw new Error('User fetch failed');
              }
            } catch {
              // New user, create profile
              const browserLanguage = navigator.language.startsWith("ja")
                ? "ja"
                : "en";
              const savedLanguage = localStorage.getItem(
                "consensusai_language"
              ) as "ja" | "en";

              userData = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || "Unknown User",
                email: firebaseUser.email || "",
                avatar: firebaseUser.photoURL || undefined,
                language: savedLanguage || browserLanguage || "ja",
              };

              // Save to SQL database via API
              try {
                const apiUserData = {
                  id: userData.id,
                  email: userData.email,
                  name: userData.name,
                  avatar: userData.avatar,
                  purpose: userData.purpose,
                  purposeSkipped: userData.purposeSkipped,
                  language: userData.language,
                };

                // Creating new user

                const response = await fetch("/api/users", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(apiUserData),
                });

                if (response.ok) {
                  const result = await response.json();
                  userData = result.user;
                  // User created successfully
                } else {
                  console.error('[AuthContext] ❌ ユーザー作成API失敗:', response.status, response.statusText);
                  const errorText = await response.text();
                  console.error('[AuthContext] エラー詳細:', errorText);
                  
                  // 500エラーの場合はより詳細なエラー情報を提供
                  if (response.status === 500) {
                    throw new Error('サーバー内部エラーが発生しました。しばらく後に再度お試しください。');
                  } else {
                    throw new Error(`ユーザー作成に失敗しました: ${response.status} ${response.statusText}`);
                  }
                }
              } catch (apiError) {
                console.error('[AuthContext] ❌ ユーザー作成処理エラー:', apiError);
                // ユーザー作成に失敗した場合は認証を無効にする
                throw new Error(apiError instanceof Error ? apiError.message : 'ユーザーデータの保存に失敗しました');
              }
            }

            // 削除済みユーザーのチェック
            if (userData.isDeleted) {
              // 削除予定の警告メッセージを表示
              const scheduledDate = userData.scheduledDeletionAt 
                ? new Date(userData.scheduledDeletionAt).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : '';
              setError(`このアカウントは削除予定です（削除予定日: ${scheduledDate}）。削除をキャンセルするには、ログイン後アカウント設定から手続きを行ってください。`);
            }
            
            setUser(userData);
            setIsAuthenticated(true);
            setLoading(false);
          } catch (authError) {
            console.error('[AuthContext] ❌ 認証処理エラー:', authError);
            setError(authError instanceof Error ? authError.message : "ユーザーデータの読み込みに失敗しました");
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      setError(null);
      setLoading(true);

      const provider = new GoogleAuthProvider();

      // Add additional scopes if needed
      provider.addScope("email");
      provider.addScope("profile");

      // Configure provider settings
      provider.setCustomParameters({
        prompt: "select_account",
      });

      await signInWithPopup(auth, provider);

      // User state will be updated by onAuthStateChanged
    } catch (error: unknown) {

      // Handle specific Firebase Auth errors
      let errorMessage = "ログインに失敗しました。";

      if (error instanceof Error) {
        const firebaseError = error as { code?: string };
        switch (firebaseError.code) {
          case "auth/popup-closed-by-user":
            errorMessage = "ログインがキャンセルされました。";
            break;
          case "auth/popup-blocked":
            errorMessage =
              "ポップアップがブロックされました。ブラウザの設定を確認してください。";
            break;
          case "auth/cancelled-popup-request":
            errorMessage = "ログイン処理がキャンセルされました。";
            break;
          case "auth/unauthorized-domain":
            errorMessage = "このドメインは認証が許可されていません。";
            break;
          case "auth/operation-not-allowed":
            errorMessage = "Google認証が有効になっていません。";
            break;
          default:
            errorMessage = `ログインエラー: ${error.message}`;
        }
      }

      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      // User state will be updated by onAuthStateChanged
    } catch (error: unknown) {
      setError("ログアウトに失敗しました。");
      throw error;
    }
  };

  const updateUserPurpose = async (purpose: string) => {
    if (user) {
      try {
        const updatedUser = { ...user, purpose };

        // Update via SQL API
        const apiUserData = {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          purpose: updatedUser.purpose,
          language: updatedUser.language,
        };

        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiUserData),
        });

        if (response.ok) {
          const result = await response.json();
          setUser(result.user);
        } else {
          throw new Error("API update failed");
        }
      } catch (error) {
        setError("ユーザー情報の更新に失敗しました。");
        throw error;
      }
    }
  };

  const skipPurposeSelection = async () => {
    if (user) {
      try {
        const updatedUser = { ...user, purposeSkipped: true };

        // Update via SQL API
        const apiUserData = {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          purpose: updatedUser.purpose,
          purposeSkipped: updatedUser.purposeSkipped,
          language: updatedUser.language,
        };

        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiUserData),
        });

        if (response.ok) {
          const result = await response.json();
          setUser(result.user);
        } else {
          throw new Error("API update failed");
        }
      } catch (error) {
        setError("設定のスキップに失敗しました。");
        throw error;
      }
    }
  };

  const updateUserLanguage = async (language: "ja" | "en") => {
    if (user) {
      try {
        const updatedUser = { ...user, language };

        // Update via SQL API
        const apiUserData = {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          purpose: updatedUser.purpose,
          language: updatedUser.language,
          analysisLanguage: updatedUser.analysisLanguage,
        };

        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiUserData),
        });

        if (response.ok) {
          const result = await response.json();
          setUser(result.user);
        } else {
          throw new Error("API update failed");
        }
      } catch (error) {
        setError("言語設定の更新に失敗しました。");
        throw error;
      }
    }
  };

  const updateUserAnalysisLanguage = async (analysisLanguage: "ja" | "en") => {
    if (user) {
      try {
        const updatedUser = { ...user, analysisLanguage };

        // Update via SQL API
        const apiUserData = {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          purpose: updatedUser.purpose,
          language: updatedUser.language,
          analysisLanguage: analysisLanguage, // 新しい値を確実に送信
        };

        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiUserData),
        });

        if (response.ok) {
          const result = await response.json();
          setUser(result.user);
        } else {
          throw new Error("API update failed");
        }
      } catch (error) {
        setError("分析言語設定の更新に失敗しました。");
        throw error;
      }
    }
  };

  const refreshUser = async () => {
    if (user) {
      try {
        const response = await fetch(`/api/users/${user.id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const result = await response.json();
          setUser(result.user);
        } else {
          console.warn('Failed to refresh user data:', response.status);
        }
      } catch (error) {
        console.warn('Error refreshing user data:', error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        updateUserPurpose,
        skipPurposeSelection,
        updateUserLanguage,
        updateUserAnalysisLanguage,
        refreshUser,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext, AuthProvider };
