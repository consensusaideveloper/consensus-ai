import React, { useState } from 'react';
import { MessageSquare, HelpCircle, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { usePlanStatusLite } from '../hooks/usePlanStatus';
import { usePlanDetails } from '../hooks/usePlanDetails';
import { ResponsiveHeader } from './ResponsiveHeader';
import { UserPurposeModal } from './UserPurposeModal';
import { LimitReachedDialog } from './LimitReachedDialog';
import { PLAN_TYPES } from '../constants/planTypes';

// Constants - Stripe Checkout now handled via /api/billing/create-checkout-session
const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || 'price_1RnZ6qEOZJMIcvctX9z0VHZJ';

export function NewCollection() {
  const navigate = useNavigate();
  const { addProject, updateProject } = useProjects();
  const { user } = useAuth();
  const { t } = useLanguage();
  const planStatus = usePlanStatusLite();
  const { getPlan } = usePlanDetails();
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showError, setShowError] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitErrorMessage, setLimitErrorMessage] = useState('');


  // プロジェクト名のプレースホルダーを用途別に取得
  const getProjectPlaceholders = () => {
    const purpose = user?.purpose || 'default';
    return {
      name: t(`newCollection.placeholders.${purpose}.name`),
      description: t(`newCollection.placeholders.${purpose}.description`)
    };
  };

  const placeholders = getProjectPlaceholders();

  const handleOpenPurposeModal = () => {
    setShowPurposeModal(true);
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setShowError(true);
      return;
    }

    setIsCreating(true);

    try {

      // 1. まずwebformUrlなしでプロジェクト作成
      const projectData = {
        name: projectName,
        description: description,
        status: 'collecting' as const,
        collectionMethod: 'webform' as const,
        opinionsCount: 0,
        config: {},
        tasks: []
      };

      
      const newProjectId = await addProject(projectData);

      // 2. 取得したIDでwebformUrlを保存
      if (user?.id && newProjectId) {
        
        await updateProject(newProjectId, {
          config: {
            webformUrl: `${window.location.origin}/forms/${user.id}/${newProjectId}`
          }
        });
        
      }

      // Navigate to project detail page with slight delay to ensure project is available
      setTimeout(() => {
        navigate(`/projects/${newProjectId}`);
      }, 100); // 100ms delay to ensure local state is updated
      
    } catch (error: any) {
      setIsCreating(false);
      
      // プラン制限エラーの場合は制限ダイアログを表示
      if (error?.response?.data?.code === 'PROJECT_LIMIT_EXCEEDED') {
        const freePlanLimit = getPlan(PLAN_TYPES.FREE)?.limits.plan.maxProjects || 1;
        setLimitErrorMessage(
          error.response.data.error || 
          error.response.data.message || 
          t('newCollection.errors.freePlanLimit', { limit: freePlanLimit })
        );
        setShowLimitDialog(true);
      } else {
        // その他のエラーは従来通り
        alert('プロジェクトの作成に失敗しました。もう一度お試しください。');
      }
    }
  };

  const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectName(e.target.value);
    if (showError && e.target.value.trim()) {
      setShowError(false);
    }
  };

  const canCreate = projectName.trim();

  const showTooltip = (id: string) => {
    setActiveTooltip(id);
  };

  const hideTooltip = () => {
    setActiveTooltip(null);
  };

  // 用途別のサブタイトル
  const getPurposeSubtitle = () => {
    const purpose = user?.purpose || 'default';
    return t(`newCollection.subtitles.${purpose}`);
  };

  const handleStartTrial = async () => {
    try {
      console.log('[NewCollection] Starting Stripe Checkout for trial...');
      
      // Stripe Checkout セッション作成
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
          enableTrial: true,
          successUrl: window.location.origin + '/new-collection?trial=success',
          cancelUrl: window.location.origin + '/new-collection?trial=cancel'
        })
      });

      const data = await response.json();
      
      if (data.success && data.url) {
        console.log('[NewCollection] Redirecting to Stripe Checkout:', data.url);
        window.location.href = data.url; // Stripeチェックアウトページに遷移
      } else {
        throw new Error(data.error || 'Failed to create Stripe Checkout session');
      }
    } catch (error) {
      console.error('Stripe Checkout failed:', error);
      alert('トライアルの開始に失敗しました。もう一度お試しください。');
    }
  };

  const handleUpgradeClick = async () => {
    try {
      // Checkout Session APIを使用してuserIdを渡す
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({
          priceId: STRIPE_PRICE_ID,
          successUrl: `${window.location.origin}/dashboard?upgrade=success`,
          cancelUrl: `${window.location.origin}/dashboard?upgrade=cancelled`,
          enableTrial: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create checkout session');
      }

      const data = await response.json();
      
      if (data.url) {
        // Stripeのチェックアウトページにリダイレクト
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert(t('billing.error') || 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <ResponsiveHeader 
        breadcrumbs={[
          { label: t('breadcrumb.dashboard'), path: '/dashboard' },
          { label: t('newCollection.title') }
        ]}
        onOpenPurposeSettings={handleOpenPurposeModal}
        actions={<div></div>}
      />


      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 text-blue-600 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">{t('newCollection.title')}</h2>
            <p className="text-gray-600 text-base sm:text-lg">{getPurposeSubtitle()}</p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {/* Project Name */}
            <div>
              <div className="flex items-center mb-3">
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">
                  {t('newCollection.projectName')} <span className="text-red-500">*</span>
                </label>
                <div className="relative ml-2">
                  <button
                    onMouseEnter={() => showTooltip('projectName')}
                    onMouseLeave={hideTooltip}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                  {activeTooltip === 'projectName' && (
                    <div className="absolute left-6 top-0 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10">
                      {t('newCollection.projectNameHelp')}
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  )}
                </div>
              </div>
              <input
                type="text"
                id="projectName"
                value={projectName}
                onChange={handleProjectNameChange}
                placeholder={placeholders.name}
                className={`w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base sm:text-lg ${showError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
              />
              {showError && (
                <p className="text-sm text-red-600 mt-2">
                  {t('newCollection.projectNameError')}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center mb-3">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  {t('newCollection.description')}
                </label>
                <div className="relative ml-2">
                  <button
                    onMouseEnter={() => showTooltip('description')}
                    onMouseLeave={hideTooltip}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                  {activeTooltip === 'description' && (
                    <div className="absolute left-6 top-0 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10">
                      {t('newCollection.descriptionHelp')}
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  )}
                </div>
              </div>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={placeholders.description}
                rows={3}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
              />
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                {t('newCollection.descriptionNote')}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 sm:py-4 px-4 sm:px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
              >
                {t('newCollection.cancel')}
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!canCreate || isCreating}
                className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm sm:text-base ${canCreate && !isCreating
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3"></div>
                    {t('newCollection.creating')}
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                    {t('newCollection.createForm')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* User Purpose Modal */}
      <UserPurposeModal
        isOpen={showPurposeModal}
        onClose={() => setShowPurposeModal(false)}
      />

      {/* Limit Reached Dialog */}
      <LimitReachedDialog
        isOpen={showLimitDialog}
        onClose={() => setShowLimitDialog(false)}
        dialogType={planStatus?.effectiveStatus === PLAN_TYPES.FREE ? "trial-confirmation" : "limit"}
        limitType="project"
        message={limitErrorMessage}
        onConfirm={handleStartTrial}
        onStartTrial={handleStartTrial}
        onUpgrade={handleUpgradeClick}
      />
    </div>
  );
}