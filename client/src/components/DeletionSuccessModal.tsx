import { CheckCircle, Calendar, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { PLAN_TYPES } from '../constants/planTypes';

interface DeletionSuccessModalProps {
  scheduledDeletionDate: string;
  subscriptionInfo?: {
    cancelled: boolean;
    originalStatus: string;
  } | null;
  onClose: () => void;
}

export function DeletionSuccessModal({ scheduledDeletionDate, subscriptionInfo, onClose }: DeletionSuccessModalProps) {
  const { t, language } = useLanguage();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === 'ja' ? 'ja-JP' : 'en-US',
      { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      }
    );
  };

  const getDaysUntilDeletion = () => {
    const now = new Date();
    const deletionDate = new Date(scheduledDeletionDate);
    const diffTime = deletionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysUntilDeletion();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12" />
          </div>
          <h3 className="text-xl font-bold text-center">
            {t('accountSettings.accountDeletion.successTitle')}
          </h3>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Deletion Schedule Info */}
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">
                    {t('accountSettings.accountDeletion.scheduledFor')}
                  </h4>
                  <p className="text-sm text-blue-800">
                    {formatDate(scheduledDeletionDate)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {t('accountSettings.accountDeletion.daysRemaining', { days: daysRemaining })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Information */}
          {subscriptionInfo?.originalStatus && subscriptionInfo.originalStatus !== PLAN_TYPES.FREE && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">
                      {t(`accountSettings.accountDeletion.planInfo.${subscriptionInfo.originalStatus}.title`)}
                    </h4>
                    <p className="text-sm text-blue-800">
                      {t(`accountSettings.accountDeletion.planInfo.${subscriptionInfo.originalStatus}.description`)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Important Notice */}
          <div className="mb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-900 mb-1">
                    {t('accountSettings.accountDeletion.importantNotice')}
                  </h4>
                  <p className="text-sm text-amber-800 mb-2">
                    {t('accountSettings.accountDeletion.canCancelAnytime')}
                  </p>
                  <p className="text-xs text-amber-700">
                    {t('accountSettings.accountDeletion.finalWarning')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              {t('accountSettings.accountDeletion.whatHappensNext')}
            </h4>
            <div className="space-y-2">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3"></div>
                <p className="text-sm text-gray-600">
                  {t('accountSettings.accountDeletion.step1')}
                </p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3"></div>
                <p className="text-sm text-gray-600">
                  {t('accountSettings.accountDeletion.step2')}
                </p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3"></div>
                <p className="text-sm text-gray-600">
                  {t('accountSettings.accountDeletion.step3')}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            {t('common.understood')}
          </button>
        </div>
      </div>
    </div>
  );
}