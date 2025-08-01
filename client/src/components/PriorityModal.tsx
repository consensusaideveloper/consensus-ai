import { HelpCircle, Target, X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../hooks/useLanguage";

export type Priority = "high" | "medium" | "low";

export interface PriorityData {
  level: Priority | undefined;
  reason?: string;
  updatedAt?: Date;
}

interface PriorityModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  currentPriority: PriorityData;
  onSave: (priority: Priority | undefined, reason?: string) => void;
  onClose: () => void;
  allowNone?: boolean; // 「設定しない」オプションを許可するか
}

export function PriorityModal({
  isOpen,
  title,
  subtitle,
  currentPriority,
  onSave,
  onClose,
  allowNone = false,
}: PriorityModalProps) {
  const { t } = useLanguage();
  const [selectedLevel, setSelectedLevel] = useState<Priority | undefined>(
    currentPriority.level
  );
  const [reason, setReason] = useState(currentPriority.reason || "");

  const modalTitle = title || t("priorityModal.title");

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(selectedLevel, reason.trim() || undefined);
  };

  const levels: (Priority | undefined)[] = allowNone
    ? [undefined, "low", "medium", "high"]
    : ["low", "medium", "high"];

  const getLevelInfo = (level: Priority | undefined) => {
    switch (level) {
      case "high":
        return {
          text: t("priorityModal.priority.high"),
          desc: t("priorityModal.priority.highDesc"),
          color: "red",
        };
      case "medium":
        return {
          text: t("priorityModal.priority.medium"),
          desc: t("priorityModal.priority.mediumDesc"),
          color: "yellow",
        };
      case "low":
        return {
          text: t("priorityModal.priority.low"),
          desc: t("priorityModal.priority.lowDesc"),
          color: "green",
        };
      default:
        return {
          text: t("priorityModal.priority.none"),
          desc: t("priorityModal.priority.noneDesc"),
          color: "gray",
        };
    }
  };

  const getButtonStyles = (level: Priority | undefined) => {
    const info = getLevelInfo(level);
    const isSelected = selectedLevel === level;

    if (isSelected) {
      switch (info.color) {
        case "red":
          return "border-red-500 bg-red-50 text-red-800";
        case "yellow":
          return "border-yellow-500 bg-yellow-50 text-yellow-800";
        case "green":
          return "border-green-500 bg-green-50 text-green-800";
        case "gray":
          return "border-gray-500 bg-gray-50 text-gray-800";
      }
    }
    return "border-gray-200 text-gray-600 hover:border-gray-300";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-600" />
              {modalTitle}
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {subtitle && <p className="text-sm text-gray-600 mt-2">{subtitle}</p>}
        </div>

        <div className="p-6 space-y-6">
          {/* Priority Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t("priorityModal.priorityLevel")}
            </label>
            <div
              className={`grid gap-3 ${
                allowNone ? "grid-cols-2" : "grid-cols-3"
              }`}
            >
              {levels.map((level) => {
                const info = getLevelInfo(level);
                return (
                  <button
                    key={level || "none"}
                    onClick={() => setSelectedLevel(level)}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-center ${getButtonStyles(
                      level
                    )}`}
                  >
                    {level ? (
                      <Target className="h-4 w-4 mx-auto mb-1" />
                    ) : (
                      <X className="h-4 w-4 mx-auto mb-1" />
                    )}
                    <div className="text-sm font-medium">{info.text}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {info.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason Text - only show if a priority level is selected */}
          {selectedLevel && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("priorityModal.priorityReason")}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("priorityModal.reasonPlaceholder")}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                maxLength={300}
              />
              <div className="text-xs text-gray-500 mt-1">
                {t("priorityModal.characterCount")
                  .replace("{{current}}", reason.length.toString())
                  .replace("{{max}}", "300")}
              </div>
            </div>
          )}

          {/* Examples */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start">
              <HelpCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">
                  {t("priorityModal.examples.title")}
                </p>
                <ul className="text-xs space-y-1">
                  <li>
                    <strong>{t("priorityModal.priority.high")}:</strong>{" "}
                    {t("priorityModal.examples.high")}
                  </li>
                  <li>
                    <strong>{t("priorityModal.priority.medium")}:</strong>{" "}
                    {t("priorityModal.examples.medium")}
                  </li>
                  <li>
                    <strong>{t("priorityModal.priority.low")}:</strong>{" "}
                    {t("priorityModal.examples.low")}
                  </li>
                  {allowNone && (
                    <li>
                      <strong>{t("priorityModal.priority.none")}:</strong>{" "}
                      {t("priorityModal.examples.none")}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t("priorityModal.cancel")}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t("priorityModal.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
