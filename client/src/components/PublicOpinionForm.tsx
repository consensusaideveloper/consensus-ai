import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Send,
  CheckCircle,
  Brain,
  AlertCircle,
  Globe,
} from "lucide-react";
import { getDatabase, ref, get } from "firebase/database";
import { useParams, Link } from "react-router-dom";
import app from "../lib/firebase";
import { useFormLanguage } from "../hooks/useFormLanguage";
import { LimitReachedDialog } from "./LimitReachedDialog";
import { useLimitHitDetection } from "../hooks/useLimitHitDetection";
import { fetchWithLimitDetection } from "../utils/apiLimitInterceptor";

export function PublicOpinionForm() {
  const { uid, projectId } = useParams<{ uid: string; projectId: string }>();
  const { language, setLanguage, t, isLoadingProjectLanguage } = useFormLanguage(projectId, uid);
  const [opinion, setOpinion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [projectData, setProjectData] = useState<{
    name: string;
    description: string;
    isActive: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogMessage, setLimitDialogMessage] = useState("");
  const { detectAndReportLimitHit } = useLimitHitDetection();

  // 各ハンドラーをまず定義（最上位レベル）
  const handleSetJapanese = useCallback(() => setLanguage("ja"), [setLanguage]);
  const handleSetEnglish = useCallback(() => setLanguage("en"), [setLanguage]);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!uid || !projectId) return;
      
      
      try {
        // 1. Firebaseからプロジェクトデータを取得
        const db = getDatabase(app);
        const projectRef = ref(db, `users/${uid}/projects/${projectId}`);
        const snapshot = await get(projectRef);
        
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          setProjectData({
            name: data.name || t("project.nameNotSet"),
            description: data.description || "",
            isActive: data.status !== "paused",
          });
          return;
        }
        
        // 2. Firebaseにデータがない場合、SQLite APIから取得を試行
        console.log('[PublicOpinionForm] ⚠️ Firebaseにデータなし、SQLite APIから取得を試行');
        
        const apiResponse = await fetch(`/api/db/projects/${projectId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": uid,
          },
        });
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          console.log('[PublicOpinionForm] ✅ SQLite APIからプロジェクトデータ取得成功:', apiData);
          
          setProjectData({
            name: apiData.name || t("project.nameNotSet"),
            description: apiData.description || "",
            isActive: apiData.status !== "paused",
          });
          return;
        }
        
        // 3. 両方で取得できない場合
        console.log('[PublicOpinionForm] ❌ FirebaseとSQLite両方でプロジェクトが見つかりません');
        setProjectData(null);
        
      } catch (error) {
        console.error('[PublicOpinionForm] ❌ プロジェクトデータ取得エラー:', error);
        setError(t("errors.projectLoad"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [uid, projectId, t]);

  const validateOpinion = useCallback((text: string, currentLanguage: string) => {
    if (!text.trim()) {
      return currentLanguage === "ja" ? "ご意見を入力してください" : "Please enter your opinion";
    }
    if (text.length > 200) {
      return currentLanguage === "ja" ? "200文字以内で入力してください" : "Please enter within 200 characters";
    }
    return "";
  }, []);

  const handleOpinionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setOpinion(value);

    // 最小限のリアルタイムバリデーション - 文字数制限のみチェック
    if (value.length > 200) {
      setError(language === "ja" ? "200文字以内で入力してください" : "Please enter within 200 characters");
    } else {
      setError(""); // 有効な入力またはエラーをクリア
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectData?.isActive) return;

    const validationError = validateOpinion(opinion, language);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      if (!uid || !projectId) throw new Error(t("errors.userProject"));

      // 統一API経由での意見投稿（重複保存を防止）
      // fetchWithLimitDetectionを使用して制限エラーを自動検知
      const response = await fetchWithLimitDetection(`/api/db/projects/${projectId}/opinions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": uid,
        },
        body: JSON.stringify({
          content: opinion,
          isBookmarked: false,
          sentiment: "neutral",
          characterCount: opinion.length,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        
        // 意見制限エラーの場合は専用ダイアログを表示
        if (response.status === 403 && errorData?.code === 'OPINION_LIMIT_EXCEEDED') {
          detectAndReportLimitHit(
            { response: { status: 403, data: errorData } },
            'opinion_submission'
          );
          setLimitDialogMessage(errorData.message || '意見収集数の上限に達しました');
          setShowLimitDialog(true);
          setIsSubmitting(false);
          return;
        }
        
        throw new Error(`意見の保存に失敗しました: ${response.statusText}`);
      }

      await response.json();

      setIsSubmitting(false);
      setIsSubmitted(true);
      setOpinion("");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      setIsSubmitting(false);
      // 制限エラーは別途処理されるため、それ以外のエラーのみ表示
      if (!showLimitDialog) {
        setError(t("errors.submitFailed"));
      }
    }
  }, [projectData?.isActive, opinion, isSubmitting, uid, projectId, t, validateOpinion, language, detectAndReportLimitHit, showLimitDialog]);

  const handleSubmitAnother = useCallback(() => {
    setIsSubmitted(false);
    setError("");
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Language toggle component
  const LanguageToggle = () => (
    <div className="flex items-center space-x-2">
      <Globe className="h-4 w-4 text-gray-600" />
      <button
        onClick={handleSetJapanese}
        className={`px-3 py-1 text-sm rounded ${
          language === "ja"
            ? "bg-blue-600 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        日本語
      </button>
      <span className="text-gray-400">|</span>
      <button
        onClick={handleSetEnglish}
        className={`px-3 py-1 text-sm rounded ${
          language === "en"
            ? "bg-blue-600 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        English
      </button>
    </div>
  );

  // 言語ローディング中のUI表示制御
  if (isLoadingProjectLanguage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              {language === 'ja' ? '読み込み中...' : 'Loading...'}
            </h2>
            <p className="text-sm text-gray-600">
              {language === 'ja' ? 'プロジェクト設定を確認しています' : 'Checking project settings'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 text-center">
            <div className="h-12 w-12 sm:h-16 sm:w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              {t("project.notFound")}
            </h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
              {t("project.accessDenied")}
              <br />
              {t("project.urlCheck")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 text-center">
            <div className="h-12 w-12 sm:h-16 sm:w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              {t("success.title")}
            </h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
              {t("success.message")}
              <br />
              {t("success.usage")}
            </p>
            <button
              onClick={handleSubmitAnother}
              className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
            >
              {t("success.submitAnother")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center min-w-0 flex-1">
              <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-2 sm:mr-3" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  {projectData.name}
                </h1>
                {projectData.isActive ? (
                  <span className="inline-block px-2 sm:px-3 py-1 bg-green-100 text-green-800 text-xs sm:text-sm rounded-full mt-1">
                    {t("status.collecting")}
                  </span>
                ) : (
                  <span className="inline-block px-2 sm:px-3 py-1 bg-gray-100 text-gray-800 text-xs sm:text-sm rounded-full mt-1">
                    {t("status.paused")}
                  </span>
                )}
              </div>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8">
          {!projectData.isActive ? (
            <div className="text-center">
              <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                {t("project.suspended")}
              </h2>
              <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                {t("project.suspendedDescription")}
                <br />
                {t("project.waitMessage")}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6 sm:mb-8">
                <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 text-blue-600 mx-auto mb-3 sm:mb-4" />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                  {t("subtitle")}
                </h2>
                {projectData.description && (
                  <p className="text-gray-600 text-base sm:text-lg mb-3 sm:mb-4">
                    {projectData.description}
                  </p>
                )}
                <p className="text-gray-600 text-sm sm:text-base">
                  {t("form.description")}
                  <br />
                  {t("form.usage")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <label
                    htmlFor="opinion"
                    className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3"
                  >
                    {t("form.label")}{" "}
                    <span className="text-red-500">{t("form.required")}</span>
                  </label>
                  <textarea
                    id="opinion"
                    value={opinion}
                    onChange={handleOpinionChange}
                    placeholder={t("form.placeholder")}
                    rows={6}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-sm sm:text-base ${
                      error
                        ? "border-red-300 bg-red-50 focus:ring-red-500"
                        : "border-gray-300 hover:border-gray-400 focus:ring-blue-500"
                    }`}
                    maxLength={200}
                    autoFocus
                  />
                  <div className="flex justify-between items-center mt-2">
                    <div>
                      {error && (
                        <p className="text-xs sm:text-sm text-red-600">
                          {error}
                        </p>
                      )}
                    </div>
                    <p
                      className={`text-xs sm:text-sm ${
                        opinion.length > 180 ? "text-red-600" : "text-gray-500"
                      }`}
                    >
                      {t("form.charCount").replace(
                        "{count}",
                        opinion.length.toString()
                      )}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 border border-blue-200 hover:border-blue-300 transition-colors duration-200">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2 sm:mr-3 mt-0.5" />
                    </div>
                    <div className="text-xs sm:text-sm text-blue-800">
                      <p className="font-semibold mb-1 text-blue-900">
                        {t("aiInfo.title")}
                      </p>
                      <p className="text-blue-700">{t("aiInfo.description")}</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!!error || !opinion.trim() || isSubmitting}
                  className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm sm:text-base ${
                    !error && opinion.trim() && !isSubmitting
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0 active:shadow-lg"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3"></div>
                      {t("form.submitting")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                      {t("form.submit")}
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-500">
            <p>
              {t("footer.provider")}
              <br />
              {t("footer.dataUsage")}
              <br />
              <Link 
                to="/login" 
                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("footer.learnMore")}
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* 制限到達ダイアログ */}
      <LimitReachedDialog
        isOpen={showLimitDialog}
        onClose={() => setShowLimitDialog(false)}
        dialogType="limit"
        limitType="opinion"
        message={limitDialogMessage}
        onStartTrial={() => {
          // PublicOpinionFormでは認証されていないため、
          // ログイン画面へリダイレクト
          window.location.href = '/login';
        }}
        onUpgrade={() => {
          // PublicOpinionFormでは認証されていないため、
          // ログイン画面へリダイレクト
          window.location.href = '/login';
        }}
      />
    </div>
  );
}
