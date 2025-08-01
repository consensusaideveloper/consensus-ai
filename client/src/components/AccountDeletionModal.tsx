import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../hooks/useLanguage";
import { DeletionSuccessModal } from "./DeletionSuccessModal";
import { PLAN_TYPES } from "../constants/planTypes";

interface AccountDeletionModalProps {
  user: {
    id: string;
    email: string;
    name: string;
  };
  subscriptionStatus?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type DeletionStep = "reason" | "confirm";

const DELETION_REASONS = [
  "notUsing",
  "switchingService",
  "privacy",
  "cost",
  "other",
] as const;

export function AccountDeletionModal({
  user,
  subscriptionStatus,
  onClose,
  onSuccess,
}: AccountDeletionModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<DeletionStep>("reason");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scheduledDeletionDate, setScheduledDeletionDate] =
    useState<string>("");
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    cancelled: boolean;
    originalStatus: string;
  } | null>(null);

  const confirmText = t("accountSettings.accountDeletion.confirmText");

  const handleReasonSubmit = () => {
    if (!selectedReason) {
      setError(t("accountSettings.accountDeletion.selectReasonError"));
      return;
    }
    if (selectedReason === "other" && !otherReason.trim()) {
      setError(t("accountSettings.accountDeletion.enterOtherReasonError"));
      return;
    }
    setError(null);
    setStep("confirm");
  };

  const handleConfirmSubmit = async () => {
    if (confirmationText !== confirmText) {
      setError(
        t("accountSettings.accountDeletion.typeToConfirm", { confirmText })
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reason = selectedReason === "other" ? otherReason : selectedReason;

      const response = await fetch(`/api/users/${user.id}/deletion-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit deletion request");
      }

      const data = await response.json();
      setScheduledDeletionDate(data.deletionRequest.scheduledDeletionAt);
      setSubscriptionInfo(data.deletionRequest.subscriptionInfo);
      setShowSuccessModal(true);
      onSuccess();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to delete account:", error);
      setError(t("accountSettings.accountDeletion.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    onClose();
  };

  // Success modal takes precedence
  if (showSuccessModal) {
    return (
      <DeletionSuccessModal
        scheduledDeletionDate={scheduledDeletionDate}
        subscriptionInfo={subscriptionInfo}
        onClose={handleSuccessModalClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            {t("accountSettings.accountDeletion.title")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "reason" ? (
            <>
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  {t("accountSettings.accountDeletion.reasonTitle")}
                </p>
                <div className="space-y-2">
                  {DELETION_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name="deletionReason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-sm text-gray-700">
                        {t(`accountSettings.accountDeletion.reasons.${reason}`)}
                      </span>
                    </label>
                  ))}
                </div>

                {selectedReason === "other" && (
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder={t(
                      "accountSettings.accountDeletion.reasonPlaceholder"
                    )}
                    className="mt-3 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                  />
                )}
              </div>

              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  {t("accountSettings.accountDeletion.cancelButton")}
                </button>
                <button
                  onClick={handleReasonSubmit}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  次へ
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800 font-medium mb-2">
                    {t("accountSettings.accountDeletion.warning")}
                  </p>
                  <p className="text-sm text-red-700">
                    {t("accountSettings.accountDeletion.description")}
                  </p>
                </div>

                {/* プラン別の詳細説明 */}
                {subscriptionStatus && subscriptionStatus !== PLAN_TYPES.FREE && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800 font-medium mb-2">
                      {t(`accountSettings.accountDeletion.planInfo.${subscriptionStatus}.title`)}
                    </p>
                    <p className="text-sm text-blue-700">
                      {t(`accountSettings.accountDeletion.planInfo.${subscriptionStatus}.description`)}
                    </p>
                  </div>
                )}

                <p className="text-sm text-gray-600 mb-4">
                  {t("accountSettings.accountDeletion.confirmDescription")}
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("accountSettings.accountDeletion.typeToConfirm", {
                      confirmText,
                    })}
                  </label>
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder={confirmText}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep("reason")}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  戻る
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting || confirmationText !== confirmText}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? "処理中..."
                    : t("accountSettings.accountDeletion.confirmButton")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
