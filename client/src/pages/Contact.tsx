import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ContactForm } from '../components/ContactForm';
import { ResponsiveHeader } from '../components/ResponsiveHeader';
import { useLanguage } from '../hooks/useLanguage';

export function Contact() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const breadcrumbs = [
    { label: t('dashboard.breadcrumbTitle'), path: '/dashboard' },
    { label: t('contact.breadcrumbTitle') }
  ];

  const handleSuccess = () => {
    // 成功後は少し待ってからダッシュボードに戻る
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <ResponsiveHeader breadcrumbs={breadcrumbs} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ContactForm 
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </main>
    </div>
  );
}