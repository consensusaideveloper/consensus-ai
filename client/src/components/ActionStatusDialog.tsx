import React, { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';

interface ActionStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  status: 'resolved' | 'dismissed';
  actionContent: string;
  initialReason?: string;
}

const ActionStatusDialog: React.FC<ActionStatusDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  status,
  actionContent,
  initialReason = ''
}) => {
  const { t } = useLanguage();
  const [reason, setReason] = useState(initialReason);

  const handleConfirm = () => {
    onConfirm(reason);
    setReason(initialReason);
    onClose();
  };

  const handleClose = () => {
    setReason(initialReason);
    onClose();
  };

  // Update reason state when initialReason changes
  React.useEffect(() => {
    if (isOpen) {
      setReason(initialReason);
    }
  }, [isOpen, initialReason]);

  if (!isOpen) return null;

  const isResolved = status === 'resolved';
  const maxLength = 500;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isResolved 
                  ? t('responseActionDetail.statusDialog.resolvedTitle')
                  : t('responseActionDetail.statusDialog.dismissedTitle')
                }
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                「{actionContent.length > 50 ? actionContent.substring(0, 50) + '...' : actionContent}」
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <div className={`p-4 rounded-lg mb-4 ${
              isResolved 
                ? 'bg-green-50 border-l-4 border-green-400' 
                : 'bg-red-50 border-l-4 border-red-400'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {isResolved ? (
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    isResolved ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {isResolved 
                      ? t('responseActionDetail.statusDialog.resolvedMessage')
                      : t('responseActionDetail.statusDialog.dismissedMessage')
                    }
                  </p>
                  <p className={`text-xs mt-1 ${
                    isResolved ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isResolved 
                      ? t('responseActionDetail.statusDialog.resolvedDescription')
                      : t('responseActionDetail.statusDialog.dismissedDescription')
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Reason Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('responseActionDetail.statusDialog.reasonLabel')}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  isResolved
                    ? t('responseActionDetail.statusDialog.resolvedPlaceholder')
                    : t('responseActionDetail.statusDialog.dismissedPlaceholder')
                }
                maxLength={maxLength}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-500">
                  {reason.length}/{maxLength}{t('responseActionDetail.statusDialog.charactersUnit')}
                </div>
                <div className="text-xs text-gray-400">
                  {t('responseActionDetail.statusDialog.reasonOptional')}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t('responseActionDetail.ui.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                isResolved
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isResolved 
                ? t('responseActionDetail.statusDialog.setResolved')
                : t('responseActionDetail.statusDialog.setDismissed')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionStatusDialog;