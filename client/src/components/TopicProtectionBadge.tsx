import { Shield, Lock } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";

interface TopicProtectionBadgeProps {
  topic: {
    id: string;
    name: string;
    status: string;
    hasActiveActions?: boolean;
    isProtected?: boolean;
    protectionReason?: string;
  };
  size?: "small" | "medium" | "large";
  showTooltip?: boolean;
}

export function TopicProtectionBadge({
  topic,
  size = "small",
  showTooltip = true,
}: TopicProtectionBadgeProps) {
  const { t } = useLanguage();
  
  // 保護状況の判定
  const isProtected =
    topic.isProtected || topic.status !== "UNHANDLED" || topic.hasActiveActions;

  if (!isProtected) {
    return null; // 保護されていない場合は何も表示しない
  }

  // 保護理由の判定
  let protectionReason = topic.protectionReason;
  if (!protectionReason) {
    if (topic.status !== "UNHANDLED") {
      protectionReason = `${t('topicProtectionBadge.status')}: ${topic.status}`;
    } else if (topic.hasActiveActions) {
      protectionReason = t('topicProtectionBadge.actionManaged');
    } else {
      protectionReason = t('topicProtectionBadge.inProgress');
    }
  }

  // サイズに応じたスタイル
  const sizeClasses = {
    small: "px-2 py-1 text-xs",
    medium: "px-3 py-1.5 text-sm",
    large: "px-4 py-2 text-base",
  };

  const iconSizes = {
    small: "h-3 w-3",
    medium: "h-4 w-4",
    large: "h-5 w-5",
  };

  return (
    <div className="relative inline-flex">
      <span
        className={`
          inline-flex items-center gap-1 rounded-full font-medium
          bg-blue-50 text-blue-700 border border-blue-200
          ${sizeClasses[size]}
        `}
        title={showTooltip ? `${t('topicProtectionBadge.protected')}: ${protectionReason}` : undefined}
      >
        <Lock className={`${iconSizes[size]} text-blue-600`} />
        <span>{t('topicProtectionBadge.inProgress')}</span>
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          <div className="text-center">
            <div className="font-semibold">
              {t('topicProtectionBadge.protectedFull')}
            </div>
            <div className="mt-1">{protectionReason}</div>
            <div className="mt-1 text-gray-300">
              {t('topicProtectionBadge.safeToAdd')}
            </div>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
}

interface TopicProtectionIndicatorProps {
  totalTopics: number;
  protectedTopics: number;
  size?: "small" | "medium";
}

export function TopicProtectionIndicator({
  totalTopics,
  protectedTopics,
  size = "small",
}: TopicProtectionIndicatorProps) {
  const { t } = useLanguage();
  
  if (protectedTopics === 0) {
    return null;
  }

  const protectionRate = Math.round((protectedTopics / totalTopics) * 100);

  const sizeClasses = {
    small: "px-2 py-1 text-xs",
    medium: "px-3 py-1.5 text-sm",
  };

  const iconSizes = {
    small: "h-3 w-3",
    medium: "h-4 w-4",
  };

  return (
    <div
      className={`
      inline-flex items-center gap-1 rounded-full font-medium
      bg-green-50 text-green-700 border border-green-200
      ${sizeClasses[size]}
    `}
    >
      <Shield className={`${iconSizes[size]} text-green-600`} />
      <span>{t('topicProtectionBadge.protectedCount', { count: protectedTopics })}</span>
      <span className="text-green-600">({protectionRate}%)</span>
    </div>
  );
}
