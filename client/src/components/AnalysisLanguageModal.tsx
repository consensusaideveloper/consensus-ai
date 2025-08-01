import React, { useState } from "react";
import { Globe, CheckCircle, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";

interface AnalysisLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalysisLanguageModal({ isOpen, onClose }: AnalysisLanguageModalProps) {
  const { user, updateUserAnalysisLanguage } = useAuth();
  const { t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<'ja' | 'en' | null>(
    user?.analysisLanguage || user?.language as 'ja' | 'en' || 'ja' // analysisLanguageを優先、なければlanguageを使用
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedLanguage) return;

    setIsSubmitting(true);
    try {
      await updateUserAnalysisLanguage(selectedLanguage);
      onClose();
    } catch (error) {
      console.error('分析言語設定エラー:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Globe className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('analysisLanguageModal.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            {t('analysisLanguageModal.description')}
          </p>

          {/* Language Options */}
          <div className="space-y-3 mb-6">
            <div
              onClick={() => setSelectedLanguage('ja')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedLanguage === 'ja'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇯🇵</span>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {t('analysisLanguageModal.options.japanese.name')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('analysisLanguageModal.options.japanese.description')}
                    </p>
                  </div>
                </div>
                {selectedLanguage === 'ja' && (
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                )}
              </div>
            </div>

            <div
              onClick={() => setSelectedLanguage('en')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedLanguage === 'en'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {t('analysisLanguageModal.options.english.name')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('analysisLanguageModal.options.english.description')}
                    </p>
                  </div>
                </div>
                {selectedLanguage === 'en' && (
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                )}
              </div>
            </div>
          </div>

          {/* Recommended Notice */}
          {user?.language && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-800">
                {t('analysisLanguageModal.recommendedNotice', { 
                  currentLanguage: user.language === 'ja' ? 
                    t('analysisLanguageModal.options.japanese.name') : 
                    t('analysisLanguageModal.options.english.name')
                })}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {t('analysisLanguageModal.actions.later')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedLanguage || isSubmitting}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedLanguage && !isSubmitting
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('analysisLanguageModal.actions.saving')}
                </div>
              ) : (
                t('analysisLanguageModal.actions.save')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}