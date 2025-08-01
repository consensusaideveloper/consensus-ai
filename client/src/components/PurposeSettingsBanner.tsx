import { Target, X, ArrowRight } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";

interface PurposeSettingsBannerProps {
  onOpenPurposeSettings: () => void;
  onDismiss: () => void;
}

export function PurposeSettingsBanner({
  onOpenPurposeSettings,
  onDismiss,
}: PurposeSettingsBannerProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              {t("purposeSettingsBanner.title")}
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              {t("purposeSettingsBanner.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onOpenPurposeSettings}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                {t("purposeSettingsBanner.setNow")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
              <button
                onClick={onDismiss}
                className="inline-flex items-center px-4 py-2 bg-white border border-blue-300 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                {t("purposeSettingsBanner.dismiss")}
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 text-blue-400 hover:text-blue-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
