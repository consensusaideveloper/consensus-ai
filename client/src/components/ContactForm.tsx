import React, { useState } from 'react';
import { Send, AlertCircle, CheckCircle, Clock, User, Mail, MessageSquare, Tag } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';

interface ContactFormData {
  name: string;
  email: string;
  category: 'technical' | 'billing' | 'feature' | 'other' | '';
  subject: string;
  message: string;
}

interface ContactFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error' | 'rateLimit';

export function ContactForm({ onSuccess, onCancel }: ContactFormProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  // フォームデータの初期化（ログインユーザーの情報で事前入力）
  const [formData, setFormData] = useState<ContactFormData>({
    name: user?.name || '',
    email: user?.email || '',
    category: '',
    subject: '',
    message: ''
  });

  const [errors, setErrors] = useState<Partial<ContactFormData>>({});
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [responseMessage, setResponseMessage] = useState<string>('');

  // バリデーション関数
  const validateForm = (): boolean => {
    const newErrors: Partial<ContactFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('contact.form.name.required');
    } else if (formData.name.length > 100) {
      newErrors.name = t('contact.form.name.maxLength');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('contact.form.email.required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('contact.form.email.invalid');
    }

    if (!formData.category) {
      newErrors.category = t('contact.form.category.required');
    }

    if (!formData.subject.trim()) {
      newErrors.subject = t('contact.form.subject.required');
    } else if (formData.subject.length > 200) {
      newErrors.subject = t('contact.form.subject.maxLength');
    }

    if (!formData.message.trim()) {
      newErrors.message = t('contact.form.message.required');
    } else if (formData.message.length < 10) {
      newErrors.message = t('contact.form.message.minLength');
    } else if (formData.message.length > 5000) {
      newErrors.message = t('contact.form.message.maxLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmissionState('submitting');
    setErrors({});

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id && { 'x-user-id': user.id })
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSubmissionState('success');
        setResponseMessage(t('contact.messages.successDescription'));
        
        // フォームをリセット
        setFormData({
          name: user?.name || '',
          email: user?.email || '',
          category: '',
          subject: '',
          message: ''
        });

        // 成功コールバック実行
        setTimeout(() => {
          onSuccess?.();
        }, 2000);

      } else {
        // エラーハンドリング
        if (response.status === 429) {
          setSubmissionState('rateLimit');
          setResponseMessage(t('contact.messages.rateLimitDescription'));
        } else {
          setSubmissionState('error');
          setResponseMessage(data.message || t('contact.messages.errorDescription'));
        }
      }

    } catch (error) {
      console.error('Contact form submission error:', error);
      setSubmissionState('error');
      setResponseMessage(t('contact.messages.networkError'));
    }
  };

  // 入力フィールド変更処理
  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // 優先度表示
  const getPriorityInfo = (category: string) => {
    const priorityMap = {
      billing: t('contact.priority.high'),
      technical: t('contact.priority.normal'),
      feature: t('contact.priority.low'),
      other: t('contact.priority.normal')
    };
    return priorityMap[category as keyof typeof priorityMap] || '';
  };

  // 成功状態の表示
  if (submissionState === 'success') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            {t('contact.messages.success')}
          </h3>
          <p className="text-green-700 mb-4">
            {responseMessage}
          </p>
          <div className="flex items-center justify-center text-sm text-green-600">
            <Clock className="h-4 w-4 mr-2" />
            <span>{getPriorityInfo(formData.category)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <h2 className="text-2xl font-bold mb-2">{t('contact.title')}</h2>
          <p className="text-blue-100">{t('contact.subtitle')}</p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* エラー・情報メッセージ */}
          {(submissionState === 'error' || submissionState === 'rateLimit') && (
            <div className={`border rounded-lg p-4 ${
              submissionState === 'rateLimit' 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start">
                <AlertCircle className={`h-5 w-5 mt-0.5 mr-3 ${
                  submissionState === 'rateLimit' ? 'text-yellow-600' : 'text-red-600'
                }`} />
                <div>
                  <h4 className={`font-medium ${
                    submissionState === 'rateLimit' ? 'text-yellow-900' : 'text-red-900'
                  }`}>
                    {submissionState === 'rateLimit' 
                      ? t('contact.messages.rateLimit')
                      : t('contact.messages.error')
                    }
                  </h4>
                  <p className={`text-sm mt-1 ${
                    submissionState === 'rateLimit' ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {responseMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 名前 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 mr-2" />
                {t('contact.form.name.label')} <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('contact.form.name.placeholder')}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={submissionState === 'submitting'}
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* メールアドレス */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 mr-2" />
                {t('contact.form.email.label')} <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder={t('contact.form.email.placeholder')}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={submissionState === 'submitting'}
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          {/* カテゴリ */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Tag className="h-4 w-4 mr-2" />
              {t('contact.form.category.label')} <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.category ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={submissionState === 'submitting'}
            >
              <option value="">{t('contact.form.category.placeholder')}</option>
              <option value="technical">{t('contact.form.category.options.technical')}</option>
              <option value="billing">{t('contact.form.category.options.billing')}</option>
              <option value="feature">{t('contact.form.category.options.feature')}</option>
              <option value="other">{t('contact.form.category.options.other')}</option>
            </select>
            {errors.category && (
              <p className="text-red-600 text-sm mt-1">{errors.category}</p>
            )}
            {formData.category && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  {t(`contact.categoryDescriptions.${formData.category}`)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {getPriorityInfo(formData.category)}
                </p>
              </div>
            )}
          </div>

          {/* 件名 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('contact.form.subject.label')} <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder={t('contact.form.subject.placeholder')}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.subject ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={submissionState === 'submitting'}
            />
            {errors.subject && (
              <p className="text-red-600 text-sm mt-1">{errors.subject}</p>
            )}
          </div>

          {/* メッセージ */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('contact.form.message.label')} <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder={t('contact.form.message.placeholder')}
              rows={6}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical ${
                errors.message ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={submissionState === 'submitting'}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.message ? (
                <p className="text-red-600 text-sm">{errors.message}</p>
              ) : (
                <div />
              )}
              <p className="text-gray-500 text-sm">
                {formData.message.length}/5000
              </p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={submissionState === 'submitting'}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submissionState === 'submitting' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('contact.form.submitting')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('contact.form.submit')}
                </>
              )}
            </button>
            
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={submissionState === 'submitting'}
                className="flex-1 sm:flex-none bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('contact.form.cancel')}
              </button>
            )}
          </div>
        </form>

        {/* 注意事項 */}
        <div className="bg-gray-50 p-6 border-t border-gray-100">
          <h4 className="font-medium text-gray-900 mb-2">{t('contact.notes.title')}</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• {t('contact.notes.privacy')}</li>
            <li>• {t('contact.notes.noSpam')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}