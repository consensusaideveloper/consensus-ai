import React, { useState } from 'react';
import { Brain, ArrowRight, MessageSquare, BarChart3, AlertCircle, Globe } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

export function LoginScreen() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setLocalError(null);
    
    try {
      await login();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('login.errors.loginFailed');
      setLocalError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-12 flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center mb-8">
            <Brain className="h-10 w-10 text-white mr-3" />
            <h1 className="text-3xl font-bold text-white">{t('login.title')}</h1>
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
            {t('login.hero.title')}
            <span className="block text-blue-200">{t('login.hero.subtitle')}</span>
          </h2>
          
          <p className="text-xl text-blue-100 mb-12 leading-relaxed">
            {t('login.hero.description').split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index === 0 && <br />}
              </React.Fragment>
            ))}
          </p>

          <div className="space-y-6">
            <div className="flex items-center text-white">
              <MessageSquare className="h-6 w-6 mr-4 text-blue-200" />
              <span className="text-lg">{t('login.features.collection')}</span>
            </div>
            <div className="flex items-center text-white">
              <Brain className="h-6 w-6 mr-4 text-blue-200" />
              <span className="text-lg">{t('login.features.analysis')}</span>
            </div>
            <div className="flex items-center text-white">
              <BarChart3 className="h-6 w-6 mr-4 text-blue-200" />
              <span className="text-lg">{t('login.features.management')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Language Toggle - Top Right */}
        <div className="absolute top-4 right-4">
          <button
            onClick={async () => {
              const newLanguage = language === 'ja' ? 'en' : 'ja';
              try {
                await setLanguage(newLanguage);
              } catch {
                // Language switching error
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

        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center mb-4 hover:opacity-80 transition-opacity"
            >
              <Brain className="h-10 w-10 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t('login.title')}
              </h1>
            </button>
            <p className="text-gray-600">{t('login.mobile.tagline')}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('login.form.title')}</h2>
              <p className="text-gray-600">{t('login.form.subtitle')}</p>
            </div>

            {/* Error Message */}
            {displayError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-sm text-red-700">{displayError}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className={`w-full border-2 border-gray-200 rounded-xl py-4 px-6 flex items-center justify-center hover:border-gray-300 hover:shadow-md transition-all duration-200 group ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'bg-white'
              }`}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mr-3"></div>
              ) : (
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span className={`font-medium ${isLoading ? 'text-gray-500' : 'text-gray-700 group-hover:text-gray-900'}`}>
                {isLoading ? t('login.form.loading') : t('login.google')}
              </span>
              {!isLoading && (
                <ArrowRight className="w-5 h-5 ml-3 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" />
              )}
            </button>

            <div className="mt-8 text-center text-sm text-gray-500">
              {t('login.agreement')}{' '}
              <button 
                onClick={() => window.open('/terms', '_blank', 'noopener,noreferrer')}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                {t('login.terms')}
              </button>
              {' '}{t('login.and')}{' '}
              <button 
                onClick={() => window.open('/privacy', '_blank', 'noopener,noreferrer')}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                {t('login.privacy')}
              </button>
              {t('login.agree')}
            </div>
          </div>


          {/* Firebase Console Setup Instructions */}
          {displayError && displayError.includes('認証が許可されていません') && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">{t('login.firebase.setupRequired')}</h3>
              <div className="text-xs text-blue-700 space-y-1">
                <p>{t('login.firebase.instructions.step1')}</p>
                <p>{t('login.firebase.instructions.step2')}</p>
                <p>{t('login.firebase.instructions.step3')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}