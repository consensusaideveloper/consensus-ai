import React, { useState } from "react";
import {
  AlertTriangle,
  Database,
  Upload,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";
import { useAuth } from "../hooks/useAuth";
import { useLimitHitDetection } from "../hooks/useLimitHitDetection";
import { LimitReachedDialog } from "./LimitReachedDialog";
import { fetchWithLimitDetection } from "../utils/apiLimitInterceptor";
import { PLAN_TYPES } from "../constants/planTypes";
// Firebase imports removed - bulk upload now uses optimized backend API

interface BulkUploadResults {
  success: number;
  total: number;
  errors: string[];
}

interface BulkUploadModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onUploadComplete?: (results: BulkUploadResults) => void;
}

// テキストから意見を抽出する関数（「」で囲まれたテキスト優先、なければ改行区切りで抽出）
const extractResponsesFromText = (text: string): string[] => {
  if (!text.trim()) return [];
  
  const responses: string[] = [];
  
  // 1. まず「」で囲まれた意見を抽出
  const quotedPattern = /「([^」]+)」/g;
  let match;
  while ((match = quotedPattern.exec(text)) !== null) {
    let response = match[1].trim();
    response = response.replace(/^[\d.\s:：\-–—)】]+/, "").trim();
    if (response && response.length > 0 && response.length <= 500) {
      responses.push(response);
    }
  }
  
  // 2. 「」で囲まれた意見がない場合は、改行区切りで抽出
  if (responses.length === 0) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      // 番号、記号、括弧などの前置きを除去
      let response = line.replace(/^[\d.\s:：\-–—)】「」『』""''（）()]+/, "").trim();
      // 末尾の記号も除去
      response = response.replace(/[「」『』""''（）()。、，．,:：；]+$/, "").trim();
      
      if (response && response.length >= 3 && response.length <= 500) {
        responses.push(response);
      }
    }
  }

  return responses.slice(0, 100); // 最大100件まで
};

export function BulkUploadModal({ 
  isOpen, 
  projectId, 
  onClose, 
  onUploadComplete 
}: BulkUploadModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bulkTestData, setBulkTestData] = useState("");
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkUploadResults, setBulkUploadResults] = useState<BulkUploadResults | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogMessage, setLimitDialogMessage] = useState("");
  const { detectAndReportLimitHit } = useLimitHitDetection();

  // バルクアップロード処理
  const handleBulkUpload = async () => {
    if (!bulkTestData.trim() || !user?.id) return;

    const responses = extractResponsesFromText(bulkTestData);
    if (responses.length === 0) return;

    setIsBulkUploading(true);
    setBulkUploadResults(null);

    const results: BulkUploadResults = {
      success: 0,
      total: responses.length,
      errors: [],
    };

    try {
      // 最適化された一括登録APIを使用（Firebase同期・AI分析・並行処理を含む）
      // fetchWithLimitDetectionを使用して制限エラーを自動検知
      const bulkResponse = await fetchWithLimitDetection(`/api/db/projects/${projectId}/opinions/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
        body: JSON.stringify({
          opinions: responses.map(response => ({
            content: response,
            isBookmarked: false,
            sentiment: "neutral",
            characterCount: response.length,
          })),
        }),
      });

      if (bulkResponse.ok) {
        const bulkResults = await bulkResponse.json();
        results.success = bulkResults.results.success;
        results.errors = bulkResults.results.errors;
      } else {
        const errorData = await bulkResponse.json().catch(() => null);
        
        // 意見制限エラーの場合は専用ダイアログを表示
        if (bulkResponse.status === 403 && errorData?.code === 'OPINION_LIMIT_EXCEEDED') {
          detectAndReportLimitHit(
            { response: { status: 403, data: errorData } },
            'bulk_opinion_upload'
          );
          setLimitDialogMessage(errorData.message || t('bulkUploadModal.errors.opinionLimitExceeded'));
          setShowLimitDialog(true);
          setIsBulkUploading(false);
          return;
        }
        
        const errorText = errorData?.message || bulkResponse.statusText;
        results.errors.push(`Bulk upload error: ${errorText}`);
      }

      setBulkUploadResults(results);
      
      if (results.success === results.total) {
        setBulkTestData("");
      }

      // 結果を親コンポーネントに通知
      onUploadComplete?.(results);

    } catch (error) {
      // 制限エラーは別途処理されるため、それ以外のエラーのみ表示
      if (!showLimitDialog) {
        results.errors.push(
          error instanceof Error ? error.message : t('bulkUploadModal.errors.processingError')
        );
        setBulkUploadResults(results);
      }
    } finally {
      if (!showLimitDialog) {
        setIsBulkUploading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Database className="h-5 w-5 mr-2 text-blue-600" />
              {t("projectDetail.bulkUpload.title")}
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 警告メッセージ */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-start">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">
                  {t("projectDetail.ui.developerFeature")}
                </p>
                <p>
                  {t("projectDetail.bulkUpload.description")}
                  {t("projectDetail.bulkUpload.description2")}
                  {t("projectDetail.ui.useCarefullyInProduction")}
                </p>
              </div>
            </div>
          </div>

          {/* テキストエリア */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("projectDetail.bulkUpload.testDataLabel")}
            </label>
            <textarea
              value={bulkTestData}
              onChange={(e) => setBulkTestData(e.target.value)}
              placeholder={`${t("projectDetail.bulkUpload.placeholder")}${t(
                "projectDetail.bulkUpload.extractionNote"
              )}`}
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <div className="mt-2 text-xs text-gray-500">
              {t("projectDetail.bulkUpload.extractedCount")}{" "}
              {extractResponsesFromText(bulkTestData).length}
              {t("projectDetail.bulkUpload.extractedCountUnit")}
            </div>
          </div>

          {/* プレビュー */}
          {bulkTestData && extractResponsesFromText(bulkTestData).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {t("projectDetail.bulkUpload.previewTitle")}
              </h4>
              <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                {extractResponsesFromText(bulkTestData)
                  .slice(0, 5)
                  .map((response, index) => (
                    <div
                      key={index}
                      className="text-xs text-gray-600 mb-2 p-2 bg-white rounded border"
                    >
                      {index + 1}.{" "}
                      {response.length > 100
                        ? response.substring(0, 100) + "..."
                        : response}
                    </div>
                  ))}
                {extractResponsesFromText(bulkTestData).length > 5 && (
                  <div className="text-xs text-gray-500 text-center">
                    {t("projectDetail.bulkUpload.moreItems")}{" "}
                    {extractResponsesFromText(bulkTestData).length - 5}{" "}
                    {t("projectDetail.bulkUpload.moreItemsUnit")}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 結果表示 */}
          {bulkUploadResults && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                {t("projectDetail.bulkUpload.resultsTitle")}
              </h4>
              <div className="text-sm text-blue-800">
                <p>
                  {t("projectDetail.bulkUpload.successCount")}{" "}
                  {bulkUploadResults.success}
                  {t("projectDetail.bulkUpload.successCountSeparator")}
                  {bulkUploadResults.total}
                  {t("projectDetail.bulkUpload.successCountUnit")}
                </p>
                {bulkUploadResults.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-red-800">
                      {t("projectDetail.ui.error")}
                    </p>
                    <ul className="list-disc list-inside text-xs text-red-700 mt-1">
                      {bulkUploadResults.errors
                        .slice(0, 5)
                        .map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      {bulkUploadResults.errors.length > 5 && (
                        <li>
                          {t("projectDetail.ui.moreErrors")}{" "}
                          {bulkUploadResults.errors.length - 5}{" "}
                          {t("projectDetail.ui.moreErrorsUnit")}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t("projectDetail.ui.close")}
          </button>
          <button
            onClick={handleBulkUpload}
            disabled={
              !bulkTestData.trim() ||
              extractResponsesFromText(bulkTestData).length === 0 ||
              isBulkUploading
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isBulkUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t("projectDetail.ui.uploading")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t("projectDetail.bulkUpload.bulkUploadButtonWithCount")}
                {extractResponsesFromText(bulkTestData).length}
                {t("projectDetail.bulkUpload.bulkUploadButtonUnit")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 制限到達ダイアログ */}
      <LimitReachedDialog
        isOpen={showLimitDialog}
        onClose={() => {
          setShowLimitDialog(false);
          onClose();
        }}
        type="opinion"
        currentPlan={user?.subscriptionStatus || PLAN_TYPES.FREE}
        message={limitDialogMessage}
        onStartTrial={() => {
          navigate('/account-settings');
        }}
        onUpgrade={() => {
          navigate('/account-settings');
        }}
      />
    </div>
  );
}