import React, { useState, useEffect, useCallback } from 'react';
import { 
  Crown, 
  User, 
  BarChart3, 
  Calendar,
  Mail,
  Target,
  Globe,
  Clock,
  TrendingUp,
  Zap,
  ArrowRight,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ResponsiveHeader } from './ResponsiveHeader';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { usePlanStatus } from '../hooks/usePlanStatus';
import { usePlanDetails } from '../hooks/usePlanDetails';
import { AccountDeletionModal } from './AccountDeletionModal';
import { SubscriptionCancellationModal } from './SubscriptionCancellationModal';
import { SubscriptionRestoreModal } from './SubscriptionRestoreModal';
import { useToast } from './NotificationToast';
import { PLAN_TYPES } from '../constants/planTypes';

// Constants - 環境変数から取得（フォールバック付き）
const STRIPE_PAYMENT_URL = import.meta.env.VITE_STRIPE_PAYMENT_URL || 'https://buy.stripe.com/test_9B6eVdc3D4Cp52ccflaIM01';
const DEFAULT_PRO_PRICE = `$${import.meta.env.VITE_PRO_PRICE || '20'}`;
// const DEFAULT_PRO_PRICE_CENTS = parseInt(import.meta.env.VITE_PRO_PRICE_CENTS || '2000', 10);

// Tab types and configuration
type TabType = 'account' | 'plan' | 'billing';

interface TabItem {
  id: TabType;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const getTabItems = (t: any): TabItem[] => [
  {
    id: 'account',
    label: t('accountSettings.tabs.account'),
    shortLabel: t('accountSettings.tabs.accountShort'),
    icon: User
  },
  {
    id: 'plan',
    label: t('accountSettings.tabs.plan'),
    shortLabel: t('accountSettings.tabs.planShort'),
    icon: BarChart3
  },
  {
    id: 'billing',
    label: t('accountSettings.tabs.billing'),
    shortLabel: t('accountSettings.tabs.billingShort'),
    icon: TrendingUp
  }
];

// Progress Bar Component
interface ProgressBarProps {
  percentage: number;
  isUnlimited?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

function ProgressBar({ percentage, isUnlimited = false, color = 'blue' }: ProgressBarProps) {
  if (isUnlimited) {
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-green-500 h-2 rounded-full w-full opacity-50"></div>
      </div>
    );
  }
  
  const getColorClass = () => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      case 'blue':
      default: return 'bg-blue-500';
    }
  };
  
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${getColorClass()}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
    </div>
  );
}

// Plan Status Card Component
interface PlanStatusCardProps {
  planStatus: any;
  onUpgradeClick: () => void;
  onTrialClick: () => void;
  onCancelClick?: () => void;
  onRestoreClick?: () => void;
  isRestoringSubscription?: boolean;
  t: any;
}

function PlanStatusCard({ planStatus, onUpgradeClick, onTrialClick, onCancelClick, onRestoreClick, isRestoringSubscription, t }: PlanStatusCardProps) {
  const { language } = useLanguage();
  const { formatLimit, isLoading, getPlan } = usePlanDetails();
  
  const getUrgencyStyle = () => {
    switch (planStatus.displayInfo.urgencyLevel) {
      case 'high': return 'border-red-200 bg-red-50 ring-2 ring-red-100 shadow-red-100';
      case 'medium': return 'border-yellow-200 bg-yellow-50 ring-1 ring-yellow-100 shadow-yellow-100';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-white';
    }
  };
  
  return (
    <div className={`rounded-xl shadow-lg border p-6 ${getUrgencyStyle()}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          {planStatus.displayInfo.planIcon && (
            <div className="text-2xl mr-3">{planStatus.displayInfo.planIcon}</div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {planStatus.displayInfo.planName}
            </h3>
            <p className="text-sm text-gray-600">
              {planStatus.displayInfo.statusText}
            </p>
          </div>
        </div>
        
        {planStatus.nextBillingDate && (
          <div className="text-right">
            <div className="text-xs text-gray-500">
              {planStatus.subscriptionStatus === PLAN_TYPES.TRIAL 
                ? t('accountSettings.planStatus.nextBilling')  // "トライアル終了" / "Trial Ends"
                : planStatus.subscriptionStatus === PLAN_TYPES.PRO
                  ? (language === 'ja' ? '次回課金' : 'Next Billing')
                  : t('accountSettings.planStatus.nextBilling')
              }
            </div>
            <div className="text-sm font-medium">
              {new Date(planStatus.nextBillingDate).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Usage Section */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-gray-900 flex items-center">
          <BarChart3 className="h-4 w-4 mr-2" />
          {t('accountSettings.planStatus.usage')}
        </h4>
        
        <div className="space-y-3">
          {/* Projects */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t('accountSettings.planStatus.projects')}</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {planStatus.usage.projects.used}
                {planStatus.usage.projects.limit === -1 ? '' : `/${planStatus.usage.projects.limit}`}
              </span>
              <div className="w-20">
                <ProgressBar 
                  percentage={planStatus.usage.projects.percentage}
                  isUnlimited={planStatus.usage.projects.limit === -1}
                />
              </div>
            </div>
          </div>
          
          {/* Analyses */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {planStatus.subscriptionStatus === PLAN_TYPES.TRIAL 
                ? t('accountSettings.planStatus.analysesDaily')
                : t('accountSettings.planStatus.analyses')
              }
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {planStatus.usage.analyses.used}
                {planStatus.usage.analyses.limit === -1 ? '' : `/${planStatus.usage.analyses.limit}`}
              </span>
              <div className="w-20">
                <ProgressBar 
                  percentage={planStatus.usage.analyses.percentage}
                  isUnlimited={planStatus.usage.analyses.limit === -1}
                />
              </div>
            </div>
          </div>
          
          {/* Opinions */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t('accountSettings.planStatus.opinions')}</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {planStatus.usage.opinions.used}
                {planStatus.usage.opinions.limit === -1 ? '' : `/${planStatus.usage.opinions.limit}`}
              </span>
              <div className="w-20">
                <ProgressBar 
                  percentage={planStatus.usage.opinions.percentage}
                  isUnlimited={planStatus.usage.opinions.limit === -1}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Plan Comparison Section */}
      {planStatus.subscriptionStatus !== PLAN_TYPES.PRO && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 flex items-center mb-4">
            <Crown className="h-4 w-4 mr-2 text-purple-600" />
            {isLoading ? (
              t('accountSettings.planStatus.comparison.loading')
            ) : (
              planStatus.subscriptionStatus === PLAN_TYPES.FREE 
                ? t('accountSettings.planStatus.comparison.title', {
                    currentPlan: t('accountSettings.planStatus.freePlan'),
                    targetPlan: t('accountSettings.planStatus.proPlan')
                  })
                : t('accountSettings.planStatus.comparison.title', {
                    currentPlan: t('accountSettings.planStatus.trialPlan'),
                    targetPlan: t('accountSettings.planStatus.proPlan')
                  })
            )}
          </h4>
          
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">{t('accountSettings.planStatus.comparison.loadingDetails')}</p>
              </div>
            ) : (
              <>
                {/* Comparison Grid */}
                <div className="space-y-3">
                  {/* Projects Comparison */}
                  <div className="flex items-center justify-between py-2 border-b border-purple-100 last:border-b-0">
                    <div className="flex items-center text-sm text-gray-700">
                      <Target className="h-4 w-4 mr-2 text-purple-600" />
                      {t('accountSettings.planStatus.comparison.projectsLabel')}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">{t('accountSettings.planStatus.comparison.currentLabel')}</div>
                        <div className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {planStatus.limits.projects === -1 ? t('accountSettings.planStatus.unlimited') : `${planStatus.limits.projects}${t('accountSettings.planStatus.comparison.units.projects')}`}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-purple-500" />
                      <div className="text-center">
                        <div className="text-xs text-purple-600 mb-1">{t('accountSettings.planStatus.comparison.proLabel')}</div>
                        <div className="text-sm font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          {formatLimit('pro', 'projects')}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Analyses Comparison */}
                  <div className="flex items-center justify-between py-2 border-b border-purple-100 last:border-b-0">
                    <div className="flex items-center text-sm text-gray-700">
                      <BarChart3 className="h-4 w-4 mr-2 text-purple-600" />
                      {t('accountSettings.planStatus.comparison.analysesLabel')}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">{t('accountSettings.planStatus.comparison.currentLabel')}</div>
                        <div className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {planStatus.subscriptionStatus === PLAN_TYPES.TRIAL 
                            ? formatLimit('trial', 'analysis')
                            : planStatus.limits.analysesTotal === -1 
                              ? t('accountSettings.planStatus.unlimited') 
                              : `${planStatus.limits.analysesTotal}${t('accountSettings.planStatus.comparison.units.analyses')}`
                          }
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-purple-500" />
                      <div className="text-center">
                        <div className="text-xs text-purple-600 mb-1">{t('accountSettings.planStatus.comparison.proLabel')}</div>
                        <div className="text-sm font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          {formatLimit('pro', 'analysis')}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Opinions Comparison */}
                  <div className="flex items-center justify-between py-2 border-b border-purple-100 last:border-b-0">
                    <div className="flex items-center text-sm text-gray-700">
                      <User className="h-4 w-4 mr-2 text-purple-600" />
                      {t('accountSettings.planStatus.comparison.opinionsLabel')}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">{t('accountSettings.planStatus.comparison.currentLabel')}</div>
                        <div className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {planStatus.limits.opinionsPerProject === -1 ? t('accountSettings.planStatus.unlimited') : `${planStatus.limits.opinionsPerProject}${t('accountSettings.planStatus.comparison.units.opinions')}`}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-purple-500" />
                      <div className="text-center">
                        <div className="text-xs text-purple-600 mb-1">{t('accountSettings.planStatus.comparison.proLabel')}</div>
                        <div className="text-sm font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          {formatLimit('pro', 'opinions')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Pro Exclusive Features */}
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <div className="text-xs font-medium text-purple-700 mb-2">{t('accountSettings.planStatus.comparison.exclusiveFeatures')}</div>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center text-xs text-purple-600">
                      <CheckCircle className="h-3 w-3 mr-2" />
                      {t('accountSettings.planStatus.comparison.unlimitedProjects')}
                    </div>
                    <div className="flex items-center text-xs text-purple-600">
                      <CheckCircle className="h-3 w-3 mr-2" />
                      {t('accountSettings.planStatus.comparison.unlimitedOpinions')}
                    </div>
                    <div className="flex items-center text-xs text-purple-600">
                      <CheckCircle className="h-3 w-3 mr-2" />
                      {t('accountSettings.planStatus.comparison.extendedAnalyses', {
                        dailyLimit: getPlan(PLAN_TYPES.PRO)?.limits?.analysis?.total?.daily || 10,
                        monthlyLimit: getPlan(PLAN_TYPES.PRO)?.limits?.analysis?.total?.monthly || 100
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Value Proposition */}
                <div className="mt-3 p-3 bg-white/70 rounded-lg">
                  <div className="text-xs text-center text-gray-600">
                    {(() => {
                      // usePlanDetailsフックからProプランの価格情報を取得
                      const proPlanDetails = getPlan(PLAN_TYPES.PRO);
                      const proPrice = isLoading ? '...' : (proPlanDetails?.display?.price || DEFAULT_PRO_PRICE);
                      
                      return t('accountSettings.planStatus.comparison.valueProposition', {
                        billing: t('accountSettings.planStatus.comparison.monthlyBilling'),
                        price: t('accountSettings.planStatus.comparison.proPrice', {
                          proPrice: proPrice
                        }),
                        benefit: planStatus.subscriptionStatus === PLAN_TYPES.FREE ? 
                          t('accountSettings.planStatus.comparison.benefitFree') : 
                          planStatus.subscriptionStatus === PLAN_TYPES.TRIAL ?
                          t('accountSettings.planStatus.comparison.benefitTrial') :
                          t('accountSettings.planStatus.comparison.benefitFree') // フォールバック
                      });
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Action Button */}
      {planStatus.displayInfo.isUpgradeRecommended && (
        <div className="space-y-2">
          {/* トライアル利用可能性の明示 */}
          {!planStatus.hasUsedTrial && planStatus.subscriptionStatus === PLAN_TYPES.FREE && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-800">
                  {t('accountSettings.planStatus.trialAvailable')}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 ml-6">
                {t('accountSettings.planStatus.trialAvailableDescription')}
              </p>
            </div>
          )}
          
          {planStatus.canStartTrial ? (
            <button
              onClick={onTrialClick}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center"
            >
              <Zap className="h-4 w-4 mr-2" />
              {t('accountSettings.planStatus.startTrial')}
            </button>
          ) : planStatus.hasUsedTrial && (
            <div className="w-full bg-gray-100 py-3 px-4 rounded-lg border border-gray-300 text-center">
              <p className="text-sm text-gray-600 mb-1">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                {t('accountSettings.planStatus.trialAlreadyUsed', {
                  trialPlan: t('accountSettings.planStatus.trialPlan')
                })}
              </p>
              <p className="text-xs text-gray-500">
                {t('accountSettings.planStatus.trialUsedDescription', {
                  proPlan: t('accountSettings.planStatus.proPlan')
                })}
              </p>
            </div>
          )}
          
          {/* スマートボタン（状態別テキスト変更） */}
          <button
            onClick={onUpgradeClick}
            className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex flex-col items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            <div className="flex items-center justify-center">
              {planStatus.subscriptionStatus === PLAN_TYPES.TRIAL ? (
                // トライアル中: 支払い方法追加を促進
                <>
                  <Crown className="h-5 w-5 mr-2" />
                  {t('accountSettings.planStatus.upgrade')}
                </>
              ) : !planStatus.hasUsedTrial ? (
                // トライアル未使用: 無料トライアル開始
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  {t('accountSettings.planStatus.startFreeTrial')}
                </>
              ) : (
                // トライアル使用済み: Proアップグレード
                <>
                  <Crown className="h-5 w-5 mr-2" />
                  {t('accountSettings.planStatus.upgrade')}
                </>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Cancel Subscription Button for Pro Users - 修正版 */}
      {planStatus.subscriptionStatus === PLAN_TYPES.PRO && 
       !planStatus.isCancelScheduled && 
       !planStatus.isLoadingStripe &&
       onCancelClick && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onCancelClick}
            className="w-full py-2 px-4 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 flex items-center justify-center"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {t('accountSettings.planStatus.cancelSubscription') || 'Cancel Subscription'}
          </button>
        </div>
      )}
      
      {/* ローディング表示 */}
      {planStatus.subscriptionStatus === PLAN_TYPES.PRO && 
       planStatus.isLoadingStripe && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            {t('accountSettings.planStatus.cancelStatus.loadingStatus')}
          </div>
        </div>
      )}
      
      {/* キャンセル済み状態の表示 - 新規追加 */}
      {planStatus.subscriptionStatus === PLAN_TYPES.PRO && 
       planStatus.isCancelScheduled && 
       !planStatus.isLoadingStripe && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">
                  {t('accountSettings.planStatus.cancelStatus.cancelScheduledTitle')}
                </p>
                <p className="text-yellow-700">
                  {planStatus.contractEndDate && 
                    `${planStatus.contractEndDate.toLocaleDateString('ja-JP', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })} ${t('accountSettings.planStatus.cancelStatus.autoRenewalStopDate')}`
                  }
                </p>
              </div>
            </div>
            
            {/* 継続ボタン - 新規追加 */}
            <div className="mt-3 pt-3 border-t border-yellow-300">
              <button
                onClick={onRestoreClick}
                disabled={isRestoringSubscription}
                className={`w-full py-2 px-4 text-sm rounded-lg transition-all duration-200 flex items-center justify-center ${
                  isRestoringSubscription 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isRestoringSubscription ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    処理中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('accountSettings.planStatus.cancelStatus.continueSubscription')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Account Info Card Component
interface AccountInfoCardProps {
  user: any;
  t: any;
  language: string;
  planStatus?: any;
}

function AccountInfoCard({ user, t, language, planStatus }: AccountInfoCardProps) {
  const { showToast } = useToast();
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<{
    isDeleted: boolean;
    deletionRequestedAt?: string;
    scheduledDeletionAt?: string;
    deletionReason?: string;
    deletionCancelledAt?: string;
  } | null>(null);
  
  // 削除状態の取得
  const fetchDeletionStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/deletion-status`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeletionStatus(data.deletionStatus);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch deletion status:', error);
    }
  }, [user?.id]);
  
  useEffect(() => {
    if (user?.id) {
      fetchDeletionStatus();
    }
  }, [user?.id, fetchDeletionStatus]);
  
  
  const getPurposeText = (purpose?: string) => {
    if (!purpose) return t('accountSettings.accountInfo.purposes.notSet');
    return t(`accountSettings.accountInfo.purposes.${purpose}`) || purpose;
  };
  
  const getLanguageText = (language?: string) => {
    return t(`accountSettings.accountInfo.languages.${language || 'ja'}`);
  };
  
  const handleCancelDeletion = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/deletion-request`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      
      if (response.ok) {
        showToast(t('accountSettings.accountDeletion.cancelSuccess'), 'success');
        await fetchDeletionStatus();
      } else {
        throw new Error('Failed to cancel deletion');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to cancel deletion:', error);
      showToast(t('accountSettings.errors.loadFailed'), 'error');
    }
  };
  
  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
          <User className="h-5 w-5 mr-2" />
          {t('accountSettings.accountInfo.title')}
        </h3>
        
        {/* 削除予定の警告表示 */}
        {deletionStatus?.isDeleted && deletionStatus?.scheduledDeletionAt && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900">
                  {t('accountSettings.accountDeletion.pendingTitle')}
                </h4>
                <p className="mt-1 text-sm text-red-700">
                  {t('accountSettings.accountDeletion.pendingDescription', {
                    date: new Date(deletionStatus.scheduledDeletionAt).toLocaleDateString(
                      language === 'ja' ? 'ja-JP' : 'en-US',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    )
                  })}
                </p>
                <button
                  onClick={handleCancelDeletion}
                  className="mt-3 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                >
                  {t('accountSettings.accountDeletion.cancelDeletion')}
                </button>
              </div>
            </div>
          </div>
        )}
      
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600 flex items-center">
            <User className="h-4 w-4 mr-2" />
            {t('accountSettings.accountInfo.name')}
          </span>
          <span className="text-sm font-medium">{user?.name || '---'}</span>
        </div>
        
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600 flex items-center">
            <Mail className="h-4 w-4 mr-2" />
            {t('accountSettings.accountInfo.email')}
          </span>
          <span className="text-sm font-medium">{user?.email || '---'}</span>
        </div>
        
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            {t('accountSettings.accountInfo.purpose')}
          </span>
          <span className="text-sm font-medium">{getPurposeText(user?.purpose)}</span>
        </div>
        
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600 flex items-center">
            <Globe className="h-4 w-4 mr-2" />
            {t('accountSettings.accountInfo.language')}
          </span>
          <span className="text-sm font-medium">{getLanguageText(user?.language)}</span>
        </div>
        
        {user?.createdAt && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {t('accountSettings.accountInfo.joinDate')}
            </span>
            <span className="text-sm font-medium">
              {new Date(user.createdAt).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        )}
      </div>
      
      {/* 危険なアクション */}
      {!deletionStatus?.isDeleted && (
        <div className="mt-6 pt-4 border-t border-red-100">
          <button
            onClick={() => setShowDeletionModal(true)}
            className="w-full bg-red-50 text-red-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('accountSettings.accountDeletion.button')}
          </button>
        </div>
      )}
      </div>
    
    {/* 削除確認モーダル */}
    {showDeletionModal && (
      <AccountDeletionModal
        user={user}
        subscriptionStatus={planStatus?.subscriptionStatus}
        onClose={() => setShowDeletionModal(false)}
        onSuccess={() => {
          setShowDeletionModal(false);
          fetchDeletionStatus();
        }}
      />
    )}
  </>
  );
}

// Helper functions for plan history display
function getPlanDisplayName(planType: string, t: any): string {
  switch (planType) {
    case PLAN_TYPES.FREE:
      return t('accountSettings.billing.planName.free');
    case PLAN_TYPES.TRIAL:
      return t('accountSettings.billing.planName.trial');
    case PLAN_TYPES.PRO:
      return t('accountSettings.billing.planName.proMonthly');
    case PLAN_TYPES.CANCELLED:
      return t('accountSettings.billing.planName.cancelled');
    case PLAN_TYPES.EXPIRED:
      return t('accountSettings.billing.planName.expired');
    default:
      return planType;
  }
}

function getChangeTypeIcon(changeType: string): string {
  return '';
}

function getChangeDescription(changeType: string, changeReason: string | null, t: any): string {
  const baseKey = 'accountSettings.billing.changeType';
  
  switch (changeType) {
    case 'upgrade':
      return t(`${baseKey}.upgrade`);
    case 'downgrade':
      return t(`${baseKey}.downgrade`);
    case 'trial_start':
      return t(`${baseKey}.trialStart`);
    case 'trial_end':
      return t(`${baseKey}.trialEnd`);
    case 'cancel':
      return t(`${baseKey}.cancel`);
    case 'restore':
      return t(`${baseKey}.restore`);
    case 'initial':
      return t(`${baseKey}.initial`);
    default:
      return changeReason || t(`${baseKey}.planChange`);
  }
}

// Billing History Card Component
interface BillingHistoryCardProps {
  t: any;
  language: string;
}

function BillingHistoryCard({ t, language }: BillingHistoryCardProps) {
  const { user } = useAuth();
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Stripe請求履歴取得
  React.useEffect(() => {
    const fetchBillingHistory = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // プラン履歴取得（新しい実装）
        const planHistoryResponse = await fetch(`/api/users/${user.id}/plan-history`, {
          headers: {
            'x-user-id': user.id
          }
        });

        let planHistoryData: any[] = [];
        if (planHistoryResponse.ok) {
          const planData = await planHistoryResponse.json();
          planHistoryData = planData.planHistory || [];
        }

        // Stripe請求履歴取得
        const stripeResponse = await fetch(`/api/billing/history/${user.id}`, {
          headers: {
            'x-user-id': user.id
          }
        });

        let stripeInvoices: any[] = [];
        if (stripeResponse.ok) {
          const stripeData = await stripeResponse.json();
          stripeInvoices = stripeData.invoices || [];
        }

        // プラン履歴をBilling形式に変換（購入に関わるもののみ）
        const formattedPlanHistory = planHistoryData
          .filter(record => {
            // 購入に関わるプラン変更のみ表示
            const paidChangeTypes = ['upgrade', 'cancel', 'restore'];
            return paidChangeTypes.includes(record.changeType) || 
                   (record.toPlan === 'pro' || record.fromPlan === 'pro');
          })
          .map(record => {
            const planName = getPlanDisplayName(record.toPlan, t);
            const changeIcon = getChangeTypeIcon(record.changeType);
            const changeDescription = getChangeDescription(record.changeType, record.changeReason, t);
            
            return {
              id: `plan-${record.id}`,
              type: 'plan_change',
              date: record.effectiveDate,
              plan: planName,
              status: 'completed',
              amount: 0, // プラン変更自体に料金はない（実際の課金はStripe履歴で表示）
              currency: 'usd',
              description: changeDescription,
              icon: changeIcon,
              changeType: record.changeType,
              fromPlan: record.fromPlan,
              toPlan: record.toPlan
            };
          });

        // ローカル履歴構築（現在の状態補完用のみ）
        const localHistory = buildLocalHistory();
        
        // Stripe履歴をローカル形式に変換
        const formattedStripeHistory = stripeInvoices.map(invoice => ({
          id: `stripe-${invoice.id}`,
          type: 'payment',
          date: new Date(invoice.created * 1000).toISOString(),
          plan: t('accountSettings.billing.planName.proMonthly'),
          status: invoice.status === 'paid' ? 'completed' : invoice.status === 'open' ? 'processing' : 'failed',
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          description: t('accountSettings.billing.monthlyPayment'),
          icon: '',
          downloadUrl: invoice.hosted_invoice_url,
          periodStart: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
          periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null
        }));

        // 購入履歴は実際の決済のみ表示（プラン変更履歴は除外）
        const combinedHistory = [...formattedStripeHistory, ...localHistory]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setBillingHistory(combinedHistory);

      } catch (error) {
        console.error('Failed to fetch billing history:', error);
        // エラー時は基本履歴のみ表示
        setBillingHistory(buildLocalHistory());
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingHistory();
  }, [user, t]);

  // ローカル履歴構築（購入履歴のみ表示）
  const buildLocalHistory = React.useMemo(() => () => {
    if (!user) return [];
    
    const history = [];
    
    // 購入履歴のみ表示（実際に料金が発生したもののみ）
    // フリープラン、トライアルは無料のため表示しない
    
    // 3. 将来のStripe統合準備（実装後は実際のデータに置き換え）
    // 注：現在はStripe未統合のため表示しない
    /*
    // Stripe統合後に実装予定の構造例
    {
      id: 'stripe-payment-1',
      type: 'payment',
      invoiceId: 'in_...',
      date: '2024-08-01',
      amount: DEFAULT_PRO_PRICE_CENTS,
      currency: 'usd',
      plan: t('accountSettings.billing.planName.proMonthly'),
      status: 'completed',
      periodStart: '2024-08-01',
      periodEnd: '2024-09-01',
      downloadUrl: 'https://...'
    }
    */
    
    return history;
  }, [user, t]);
  
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
        <TrendingUp className="h-5 w-5 mr-2" />
        {t('accountSettings.tabs.billing')}
      </h3>
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('accountSettings.billing.loading') || 'Loading...'}</p>
        </div>
      ) : billingHistory.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <TrendingUp className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-600">{t('accountSettings.billing.noBillingHistory')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {billingHistory.map((item) => (
            <div key={item.id} className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  {/* アイコン表示 */}
                  {item.icon && <span className="text-lg mr-3">{item.icon}</span>}
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.plan}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                  </div>
                  <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                    : item.status === 'active'
                      ? 'bg-blue-100 text-blue-800'
                    : item.status === 'processing'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.status === 'completed' 
                      ? t('accountSettings.billing.completed')
                    : item.status === 'active'
                      ? t('accountSettings.billing.active')
                    : item.status === 'processing'
                      ? t('accountSettings.billing.processing')
                      : t('accountSettings.billing.failed')}
                  </span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {item.amount === 0 
                    ? t('accountSettings.billing.free')
                    : `${item.currency === 'jpy' ? '¥' : '$'}${item.amount.toLocaleString()}`
                  }
                </div>
              </div>
              
              {/* 日付表示 */}
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(item.date).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                
                {/* トライアル期限表示 */}
                {item.expiryDate && (
                  <span className="ml-4 text-xs text-orange-600">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {t('accountSettings.billing.expiresOn')}: {new Date(item.expiryDate).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                )}
              </div>
              
              {/* 将来のStripe統合時の請求書ダウンロード機能（現在は非表示） */}
              {item.type === 'payment' && item.status === 'completed' && item.downloadUrl && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      window.open(item.downloadUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {t('accountSettings.billing.downloadInvoice')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tab Navigation Component
interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  tabs: TabItem[];
}

function TabNavigation({ activeTab, onTabChange, tabs }: TabNavigationProps) {
  return (
    <>
      {/* Desktop Tab Navigation */}
      <div className="hidden md:flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center px-4 py-3 rounded-md font-medium transition-all duration-200 hover:scale-105 transform ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <IconComponent className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex justify-around border-b border-gray-200 mb-6 bg-white">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center py-3 px-2 border-b-2 transition-all duration-200 flex-1 hover:scale-105 transform ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <IconComponent className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// Tab Content Container
interface TabContentProps {
  children: React.ReactNode;
  isActive: boolean;
}

function TabContent({ children, isActive }: TabContentProps) {
  if (!isActive) return null;
  
  return (
    <div className="animate-fade-in transform transition-all duration-300 ease-out">
      {children}
    </div>
  );
}

// Main Component
export function AccountSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const planStatus = usePlanStatus();
  const { showToast } = useToast();
  
  // Subscription cancellation modal state
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  
  // Tab state management with URL sync and account-focused default
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (['account', 'plan', 'billing'].includes(tabParam)) {
      return tabParam;
    }
    
    // Always default to account tab for consistent UX
    return 'account';
  });
  
  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tab);
    setSearchParams(newSearchParams, { replace: true });
  };
  
  // Get localized tabs
  const tabs = getTabItems(t);
  
  const handleUpgradeClick = async () => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      // トライアル中かどうかでenableTrialを設定
      const enableTrial = planStatus?.subscriptionStatus !== PLAN_TYPES.TRIAL;
      
      console.log('[AccountSettings] Starting checkout:', {
        subscriptionStatus: planStatus?.subscriptionStatus,
        enableTrial,
        isTrialActive: planStatus?.isTrialActive
      });
      
      // Stripe Checkout セッション作成
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID || 'price_1234', // 環境変数またはデフォルト値
          enableTrial: enableTrial,
          successUrl: `${window.location.origin}/dashboard?tab=plan&upgrade=success`,
          cancelUrl: `${window.location.origin}/account?tab=billing&upgrade=cancelled`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const result = await response.json();
      
      if (result.success && result.url) {
        // Stripe Checkoutページにリダイレクト
        window.location.href = result.url;
      } else {
        throw new Error(result.error || 'No checkout URL received');
      }

    } catch (error) {
      console.error('Failed to start checkout:', error);
      // フォールバック: 従来のStripe決済URLを使用
      window.open(STRIPE_PAYMENT_URL, '_blank', 'noopener,noreferrer');
    }
  };
  
  const handleTrialClick = async () => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      console.log('[AccountSettings] Starting Stripe Checkout for trial (legacy handler)...');
      
      // Stripe Checkout セッション作成
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
          enableTrial: true,
          successUrl: window.location.origin + '/account?trial=success',
          cancelUrl: window.location.origin + '/account?trial=cancel'
        })
      });

      const data = await response.json();
      
      if (data.success && data.url) {
        console.log('[AccountSettings] Redirecting to Stripe Checkout:', data.url);
        window.location.href = data.url; // Stripeチェックアウトページに遷移
      } else {
        throw new Error(data.error || 'Failed to create Stripe Checkout session');
      }

    } catch (error) {
      console.error('Stripe Checkout failed:', error);
      alert('トライアルの開始に失敗しました。もう一度お試しください。');
    }
  };

  const handleCancelClick = () => {
    setShowCancellationModal(true);
  };

  const handleCancellationSuccess = () => {
    setShowCancellationModal(false);
    // 成功時はページをリロードしてプラン状況を更新
    window.location.reload();
  };

  const handleRestoreClick = () => {
    setShowRestoreModal(true);
  };

  const handleRestoreSuccess = () => {
    setShowRestoreModal(false);
    showToast(t('accountSettings.planStatus.cancelStatus.restoreSuccess'), 'success');
    window.location.reload(); // プラン状況を更新
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  const breadcrumbs = [
    { label: t('dashboard.breadcrumbTitle'), path: '/dashboard' },
    { label: t('accountSettings.breadcrumbTitle') }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <ResponsiveHeader breadcrumbs={breadcrumbs} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - パンくずリスト存在時は冗長なタイトルを削除 */}
        <div className="mb-6">
          <p className="text-gray-600 text-lg">
            {t('accountSettings.subtitle')}
          </p>
        </div>
        
        {/* Tab Navigation */}
        <TabNavigation 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabs={tabs}
        />
        
        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Account Info Tab */}
          <TabContent isActive={activeTab === 'account'}>
            <AccountInfoCard user={user} t={t} language={language} planStatus={planStatus} />
          </TabContent>
          
          {/* Plan & Usage Tab */}
          <TabContent isActive={activeTab === 'plan'}>
            {planStatus && (
              <PlanStatusCard
                planStatus={planStatus}
                onUpgradeClick={handleUpgradeClick}
                onTrialClick={handleTrialClick}
                onCancelClick={handleCancelClick}
                onRestoreClick={handleRestoreClick}
                isRestoringSubscription={false}
                t={t}
              />
            )}
          </TabContent>
          
          {/* Billing History Tab */}
          <TabContent isActive={activeTab === 'billing'}>
            <BillingHistoryCard t={t} language={language} />
          </TabContent>
        </div>
      </main>
      
      {/* Subscription Cancellation Modal */}
      {showCancellationModal && (
        <SubscriptionCancellationModal
          user={user}
          planStatus={planStatus}
          onClose={() => setShowCancellationModal(false)}
          onSuccess={handleCancellationSuccess}
        />
      )}

      {/* Subscription Restore Modal */}
      {showRestoreModal && user && (
        <SubscriptionRestoreModal
          user={user}
          planStatus={planStatus || undefined}
          onClose={() => setShowRestoreModal(false)}
          onSuccess={handleRestoreSuccess}
        />
      )}
      
      {/* アニメーション用のスタイル */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-slide-up {
          animation: slide-up 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}