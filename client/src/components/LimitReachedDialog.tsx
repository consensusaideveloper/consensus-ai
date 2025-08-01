import { createPortal } from 'react-dom';
import { X, Crown, Zap, CheckCircle } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { usePlanStatus } from '../hooks/usePlanStatus';
import { usePlanDetails } from '../hooks/usePlanDetails';
import { TrialConfig } from '../config/trialConfig';
import { PLAN_TYPES } from '../constants/planTypes';

interface LimitReachedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  // 統合されたダイアログタイプ
  dialogType: 'limit' | 'trial-confirmation' | 'upgrade-promotion';
  // 制限関連（limitタイプ時に使用）
  limitType?: 'project' | 'analysis' | 'opinion';
  message?: string;
  // アクションハンドラー
  onStartTrial?: () => void;
  onUpgrade?: () => void;
  onConfirm?: () => void; // trial-confirmation用
}

export function LimitReachedDialog({
  isOpen,
  onClose,
  dialogType,
  limitType,
  message,
  onStartTrial,
  onUpgrade,
  onConfirm
}: LimitReachedDialogProps) {
  const { t } = useLanguage();
  const planStatus = usePlanStatus();
  const { formatLimit, getPlan } = usePlanDetails();

  if (!isOpen) return null;

  // DOM要素の存在確認
  const targetElement = document.getElementById('root') || document.body;
  if (!targetElement) {
    console.error('[LimitReachedDialog] Target element for portal not found');
    return null;
  }

  const getTypeIcon = () => {
    if (dialogType === 'trial-confirmation') {
      return <Zap className="h-8 w-8 text-blue-600" />;
    }
    
    if (dialogType === 'upgrade-promotion') {
      return <Crown className="h-8 w-8 text-purple-600" />;
    }
    
    if (dialogType === 'limit' && limitType) {
      switch (limitType) {
        case 'project':
          return '📁';
        case 'analysis':
          return '🧠';
        case 'opinion':
          return '💬';
        default:
          return '⚡';
      }
    }
    
    return '⚡';
  };

  const getTypeTitle = () => {
    if (dialogType === 'trial-confirmation') {
      const trialPlan = getPlan(PLAN_TYPES.TRIAL);
      const duration = trialPlan?.meta?.duration || TrialConfig.getTrialDurationDays();
      return t('limitDialog.titles.trialWithDuration', { duration });
    }
    
    if (dialogType === 'upgrade-promotion') {
      return t('limitDialog.titles.upgradePromotion', {
        proPlan: t('limitDialog.plans.proPlan')
      });
    }
    
    if (dialogType === 'limit' && limitType) {
      switch (limitType) {
        case 'project':
          return t('limitDialog.titles.project');
        case 'analysis':
          return t('limitDialog.titles.analysis');
        case 'opinion':
          return t('limitDialog.titles.opinion');
        default:
          return t('limitDialog.titles.limit');
      }
    }
    
    return t('limitDialog.titles.limit');
  };

  // トライアル未使用ユーザーにはトライアル動線を優先表示
  const showTrialOption = !planStatus?.hasUsedTrial;

  const dialogContent = (
    <div 
      data-testid="limit-dialog-backdrop"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      style={{ zIndex: 9999 }}
    >
      <div 
        data-testid="limit-dialog-content"
        className="bg-white rounded-xl max-w-md w-full p-6 relative"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className={dialogType === 'trial-confirmation' ? 'mb-6' : 'text-center mb-6'}>
          {dialogType === 'trial-confirmation' ? (
            <div className="flex items-center mb-4">
              {getTypeIcon()}
              <h3 className="text-xl font-bold text-gray-900 ml-3">
                {getTypeTitle()}
              </h3>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-3">{getTypeIcon()}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {getTypeTitle()}
              </h3>
              {message && (
                <p className="text-gray-600 text-sm">
                  {message}
                </p>
              )}
            </>
          )}
        </div>

        {/* Content Area */}
        {dialogType === 'limit' ? (
          /* Plan Comparison */
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{t('limitDialog.plans.freePlan')}</div>
                <div className="text-sm text-gray-500">{t('limitDialog.plans.currentPlan')}</div>
              </div>
              <div className="text-sm text-gray-600">
                {limitType === 'project' ? formatLimit('free', 'projects') : 
                 limitType === 'analysis' ? formatLimit('free', 'analysis') : 
                 limitType === 'opinion' ? formatLimit('free', 'opinions') : 
                 t('limitDialog.limits.withLimits')}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <div className="font-medium text-blue-900 flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  {t('limitDialog.plans.trialPlan')}
                </div>
                <div className="text-sm text-blue-600">{getPlan(PLAN_TYPES.TRIAL)?.display.price || t('common.plans.trial')}</div>
              </div>
              <div className="text-sm text-blue-700">
                {limitType === 'project' ? formatLimit('trial', 'projects') : 
                 limitType === 'analysis' ? formatLimit('trial', 'analysis') : 
                 limitType === 'opinion' ? formatLimit('trial', 'opinions') : 
                 t('limitDialog.limits.expandedLimits')}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div>
                <div className="font-medium text-purple-900 flex items-center">
                  <Crown className="h-4 w-4 mr-2" />
                  {t('limitDialog.plans.proPlan')}
                </div>
                <div className="text-sm text-purple-600">{getPlan(PLAN_TYPES.PRO)?.display.billing || t('limitDialog.pricing.monthly')} {getPlan(PLAN_TYPES.PRO)?.display.price}</div>
              </div>
              <div className="text-sm text-purple-700">
                {limitType === 'project' ? formatLimit('pro', 'projects') : 
                 limitType === 'analysis' ? formatLimit('pro', 'analysis') : 
                 limitType === 'opinion' ? formatLimit('pro', 'opinions') : 
                 t('limitDialog.limits.expandedLimits')}
              </div>
            </div>
          </div>
        ) : dialogType === 'trial-confirmation' ? (
          /* Trial Features List */
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              {t('limitDialog.messages.trialConfirmation', {
                duration: TrialConfig.getTrialDurationDays()
              })}
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{t('limitDialog.features.trial.maxProjects', { limit: formatLimit('trial', 'projects') })}</p>
                  <p className="text-sm text-gray-600">{t('limitDialog.features.trial.maxProjectsDesc', { 
                    freeLimit: formatLimit('free', 'projects'), 
                    trialLimit: formatLimit('trial', 'projects') 
                  })}</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{t('limitDialog.features.trial.maxAnalysis', { limit: formatLimit('trial', 'analysis') })}</p>
                  <p className="text-sm text-gray-600">{t('limitDialog.features.trial.maxAnalysisDesc')}</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{t('limitDialog.features.trial.maxOpinions')}</p>
                  <p className="text-sm text-gray-600">{t('limitDialog.features.trial.maxOpinionsDesc', { limit: formatLimit('trial', 'opinions') })}</p>
                </div>
              </div>
            </div>
          </div>
        ) : dialogType === 'upgrade-promotion' ? (
          /* Upgrade Promotion Content */
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              {t('limitDialog.messages.upgradePromotion')}
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{t('limitDialog.features.pro.continuousAccess')}</p>
                  <p className="text-sm text-gray-600">{t('limitDialog.features.pro.continuousAccessDesc')}</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{t('limitDialog.features.pro.unlimitedProjects', { limit: formatLimit('pro', 'projects') })}</p>
                  <p className="text-sm text-gray-600">{t('limitDialog.features.pro.unlimitedProjectsDesc')}</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{t('limitDialog.features.pro.advancedAnalysis')}</p>
                  <p className="text-sm text-gray-600">{t('limitDialog.features.pro.advancedAnalysisDesc', { limit: formatLimit('pro', 'analysis') })}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-800">
                <strong>{t('limitDialog.pricing.monthly')}:</strong> {getPlan(PLAN_TYPES.PRO)?.display.price}{t('limitDialog.pricing.taxExcluded')}<br />
                <strong>{t('limitDialog.pricing.billing')}:</strong> {t('limitDialog.pricing.cancellable')}
              </p>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        {dialogType === 'limit' ? (
          <div className="space-y-3">
            {showTrialOption ? (
              <>
                {/* トライアル未使用ユーザー向け: トライアルボタンを目立たせる */}
                <button
                  onClick={() => {
                    onStartTrial?.();
                    onClose();
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition-colors flex items-center justify-center shadow-md"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {t('limitDialog.buttons.startTrial')}
                </button>
                
                {/* セカンダリーオプション: Proアップグレード（控えめ） */}
                <button
                  onClick={() => {
                    onUpgrade?.();
                    onClose();
                  }}
                  className="w-full border border-purple-300 text-purple-700 py-3 px-4 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center justify-center"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {t('limitDialog.buttons.upgradeToPro')}
                </button>
              </>
            ) : planStatus?.hasUsedTrial && (
              <div className="w-full bg-gray-100 py-3 px-4 rounded-lg border border-gray-300 text-center">
                <p className="text-sm text-gray-600 mb-1">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  {t('limitDialog.messages.trialAlreadyUsed')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('limitDialog.messages.proForAllFeatures')}
                </p>
              </div>
            )}

            {/* トライアル使用済みまたは表示しない場合はPro単体 */}
            {!showTrialOption && (
              <button
                onClick={() => {
                  onUpgrade?.();
                  onClose();
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-colors flex items-center justify-center"
              >
                <Crown className="h-4 w-4 mr-2" />
                {t('limitDialog.buttons.upgradeToPro')}
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              {t('limitDialog.buttons.decideLater')}
            </button>
          </div>
        ) : dialogType === 'trial-confirmation' ? (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {t('limitDialog.buttons.cancel')}
            </button>
            <button
              onClick={() => {
                onConfirm?.();
                onClose();
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium"
            >
              {t('limitDialog.buttons.startTrialAction')}
            </button>
          </div>
        ) : dialogType === 'upgrade-promotion' ? (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {t('limitDialog.buttons.decideLater')}
            </button>
            <button
              onClick={() => {
                onUpgrade?.();
                onClose();
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-colors font-medium flex items-center justify-center"
            >
              <Crown className="h-4 w-4 mr-2" />
              {t('limitDialog.buttons.continueWithPro')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(dialogContent, targetElement);
}