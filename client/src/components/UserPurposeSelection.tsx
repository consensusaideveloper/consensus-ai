import React, { useState } from 'react';
import { Building2, Users, MessageSquare, ArrowRight, CheckCircle, Brain, Store, Briefcase, Globe, ChevronLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useNavigate } from 'react-router-dom';
import { translations } from '../translations';

interface PurposeOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  examples: string[];
  color: string;
}

type SetupStep = 'purpose' | 'analysisLanguage';

// Purpose option static configurations (icons and colors only)
const purposeConfigs = {
  government: { icon: Building2, color: 'from-blue-600 to-indigo-600' },
  business: { icon: Store, color: 'from-emerald-600 to-teal-600' },
  corporate: { icon: Briefcase, color: 'from-purple-600 to-pink-600' },
  community: { icon: Users, color: 'from-amber-600 to-orange-600' },
  research: { icon: MessageSquare, color: 'from-slate-600 to-gray-600' }
};

export function UserPurposeSelection() {
  const { user, updateUserPurpose, skipPurposeSelection, updateUserAnalysisLanguage, refreshUser } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  
  // Phase 2: マルチステップ状態管理
  const [currentStep, setCurrentStep] = useState<SetupStep>('purpose');
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);
  const [selectedAnalysisLanguage, setSelectedAnalysisLanguage] = useState<'ja' | 'en' | null>(
    // 推奨値: ユーザーのUI言語設定またはブラウザ言語
    (user?.language as 'ja' | 'en') || (language === 'en' ? 'en' : 'ja')
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate purpose options dynamically from translations
  const purposeOptions: PurposeOption[] = Object.keys(purposeConfigs).map((id) => {
    const config = purposeConfigs[id as keyof typeof purposeConfigs];
    
    // Direct access to translation data for arrays
    const translationData = translations[language] as any;
    const examples = translationData?.userPurposeSelection?.purposes?.[id]?.examples || [];
    
    return {
      id,
      title: t(`userPurposeSelection.purposes.${id}.title`),
      description: t(`userPurposeSelection.purposes.${id}.description`),
      icon: config.icon,
      examples: Array.isArray(examples) ? examples : [],
      color: config.color
    };
  });

  // Phase 2: マルチステップハンドラー
  const handlePurposeNext = () => {
    if (!selectedPurpose) return;
    setCurrentStep('analysisLanguage');
  };

  const handlePurposeSkip = () => {
    setCurrentStep('analysisLanguage');
  };

  const handleAnalysisLanguageBack = () => {
    setCurrentStep('purpose');
  };

  const handleFinalSubmit = async () => {
    if (!selectedAnalysisLanguage) return;

    setIsSubmitting(true);

    try {
      // Step 1: Save purpose (or skip)
      if (selectedPurpose) {
        await updateUserPurpose(selectedPurpose);
      } else {
        await skipPurposeSelection();
      }

      // Step 2: Save analysis language
      await updateUserAnalysisLanguage(selectedAnalysisLanguage);

      // Step 3: ユーザー情報の最新化を確実にするため refreshUser を実行
      await refreshUser();
      

      // Step 4: セットアップ完了時のanalysisLanguageModal再表示を防ぐ
      // ダッシュボードの表示判定より先に dismissal フラグを設定
      if (user?.id) {
        const dismissalKey = `analysisLanguageModalDismissed_${user.id}`;
        localStorage.setItem(dismissalKey, Date.now().toString());
      }

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Setup completion error:', error);
      setIsSubmitting(false);
    }
  };

  const selectedOption = purposeOptions.find(option => option.id === selectedPurpose);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-2 sm:mr-3" />
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{t('userPurposeSelection.header.title')}</h1>
                <p className="text-xs sm:text-sm text-gray-600">{t('userPurposeSelection.header.subtitle')}</p>
              </div>
            </button>
            
            {/* Language Toggle Button */}
            <button
              onClick={async () => {
                const newLanguage = language === 'ja' ? 'en' : 'ja';
                try {
                  await setLanguage(newLanguage);
                } catch {
                  // Language switching error - silently handle
                }
              }}
              className="flex items-center p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
              title={language === 'ja' ? 'Switch to English' : '日本語に切り替え'}
            >
              <Globe className="h-4 w-4 mr-2 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {language === 'ja' ? 'EN' : 'JP'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Phase 2: プログレスインジケーター */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'purpose' ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
              }`}>
                1
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep === 'purpose' ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {t('userPurposeSelection.progress.step1')}
              </span>
            </div>
            
            <div className={`w-8 h-0.5 ${
              currentStep === 'analysisLanguage' ? 'bg-blue-600' : 'bg-gray-300'
            }`}></div>
            
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'analysisLanguage' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'
              }`}>
                2
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep === 'analysisLanguage' ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {t('userPurposeSelection.progress.step2')}
              </span>
            </div>
          </div>
        </div>

        {/* ステップ別コンテンツ */}
        {currentStep === 'purpose' && (
          <>
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                {t('userPurposeSelection.welcome.greeting', { name: user?.name })}
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 mb-2">
                {t('userPurposeSelection.welcome.question')}
              </p>
              <p className="text-gray-500 text-sm sm:text-base px-4 sm:px-0">
                {t('userPurposeSelection.welcome.description')}
              </p>
            </div>
          </>
        )}
        
        {currentStep === 'analysisLanguage' && (
          <>
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                {t('userPurposeSelection.analysisLanguage.title')}
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 mb-2">
                {t('userPurposeSelection.analysisLanguage.question')}
              </p>
              <p className="text-gray-500 text-sm sm:text-base px-4 sm:px-0">
                {t('userPurposeSelection.analysisLanguage.description')}
              </p>
            </div>
          </>
        )}


        {/* Step 1: Purpose Options */}
        {currentStep === 'purpose' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
              {purposeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedPurpose === option.id;

                return (
                  <div
                    key={option.id}
                    onClick={() => setSelectedPurpose(option.id)}
                    className={`relative p-4 sm:p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                        <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      </div>
                    )}

                    <div className="flex items-center mb-3 sm:mb-4">
                      <div className={`p-2 sm:p-3 rounded-lg bg-gradient-to-r ${option.color} mr-2 sm:mr-3`}>
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">{option.title}</h3>
                    </div>

                    <p className="text-gray-600 mb-3 sm:mb-4 leading-relaxed text-sm">
                      {option.description}
                    </p>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-2">{t('userPurposeSelection.examplesLabel')}</h4>
                      <ul className="space-y-1">
                        {Array.isArray(option.examples) && option.examples.map((example, index) => (
                          <li key={index} className="flex items-center text-xs text-gray-600">
                            <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Purpose Preview */}
            {selectedOption && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6 sm:mb-8 animate-fade-in">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className={`p-2 sm:p-3 rounded-lg bg-gradient-to-r ${selectedOption.color} mr-3 sm:mr-4`}>
                    <selectedOption.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{selectedOption.title}</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{t('userPurposeSelection.selectedSuffix')}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 sm:p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 sm:mb-3 text-sm sm:text-base">{t('userPurposeSelection.featuresTitle')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {(() => {
                      // Direct access to translation data for arrays
                      const translationData = translations[language] as any;
                      const features = translationData?.userPurposeSelection?.features || [];
                      return Array.isArray(features) ? features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-center text-blue-800">
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
                          <span className="text-xs sm:text-sm">{feature}</span>
                        </div>
                      )) : null;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center">
              <button
                onClick={handlePurposeNext}
                disabled={!selectedPurpose || isSubmitting}
                className={`px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-200 flex items-center ${selectedPurpose && !isSubmitting
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {t('userPurposeSelection.actions.next')}
                <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 ml-2 sm:ml-3" />
              </button>
            </div>

            {/* Skip Option */}
            <div className="text-center mt-6 sm:mt-8">
              <button
                onClick={handlePurposeSkip}
                disabled={isSubmitting}
                className="text-sm underline text-gray-500 hover:text-gray-700 transition-colors"
              >
                {t('userPurposeSelection.actions.skip')}
              </button>
            </div>
          </>
        )}

        {/* Step 2: Analysis Language Selection */}
        {currentStep === 'analysisLanguage' && (
          <>
            {/* Language Options */}
            <div className="max-w-2xl mx-auto space-y-4 mb-8 sm:mb-12">
              <div
                onClick={() => setSelectedAnalysisLanguage('ja')}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedAnalysisLanguage === 'ja'
                    ? 'border-purple-500 bg-purple-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">🇯🇵</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {t('userPurposeSelection.analysisLanguage.options.japanese.name')}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {t('userPurposeSelection.analysisLanguage.options.japanese.description')}
                      </p>
                    </div>
                  </div>
                  {selectedAnalysisLanguage === 'ja' && (
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  )}
                </div>
              </div>

              <div
                onClick={() => setSelectedAnalysisLanguage('en')}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedAnalysisLanguage === 'en'
                    ? 'border-purple-500 bg-purple-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">🇺🇸</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {t('userPurposeSelection.analysisLanguage.options.english.name')}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {t('userPurposeSelection.analysisLanguage.options.english.description')}
                      </p>
                    </div>
                  </div>
                  {selectedAnalysisLanguage === 'en' && (
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleAnalysisLanguageBack}
                disabled={isSubmitting}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                {t('userPurposeSelection.actions.back')}
              </button>
              
              <button
                onClick={handleFinalSubmit}
                disabled={!selectedAnalysisLanguage || isSubmitting}
                className={`px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-200 flex items-center ${
                  selectedAnalysisLanguage && !isSubmitting
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white mr-2 sm:mr-3"></div>
                    {t('userPurposeSelection.actions.processing')}
                  </>
                ) : (
                  <>
                    {t('userPurposeSelection.analysisLanguage.complete')}
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 ml-2 sm:ml-3" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </main>

      {/* アニメーション用のスタイル */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}