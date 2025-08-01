import { AlertTriangle, X, Calendar, Clock } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../hooks/useLanguage";

interface SubscriptionCancellationModalProps {
  user: {
    id: string;
    email: string;
    name: string;
  };
  planStatus?: {
    nextBillingDate?: string;
    subscriptionStatus: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function SubscriptionCancellationModal({
  user,
  planStatus,
  onClose,
  onSuccess,
}: SubscriptionCancellationModalProps) {
  const { t, language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      const result = await response.json();
      
      if (result.success) {
        onSuccess();
      } else {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      setError(t('accountSettings.errors.upgradeFailed') || 'Failed to cancel subscription. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            {t("accountSettings.planStatus.cancelModal.title")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                {t("accountSettings.planStatus.cancelModal.warning")}
              </p>
              <p className="text-sm text-yellow-700">
                {t("accountSettings.planStatus.cancelModal.description")}
              </p>
            </div>

            {/* Billing Information */}
            {planStatus?.nextBillingDate && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {t("accountSettings.planStatus.cancelModal.effectiveUntil")}
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(planStatus.nextBillingDate).toLocaleDateString(
                      language === 'ja' ? 'ja-JP' : 'en-US',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    {t("accountSettings.planStatus.cancelModal.nextBilling")}
                  </div>
                  <div className="text-sm font-medium text-red-600">
                    {language === 'ja' ? 'なし (フリープランに変更)' : 'None (Switch to Free Plan)'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("accountSettings.planStatus.cancelModal.cancelText")}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t("accountSettings.planStatus.cancelModal.processing")}
                </>
              ) : (
                t("accountSettings.planStatus.cancelModal.confirmText")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}