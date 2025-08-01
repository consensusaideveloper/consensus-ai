// トピックステータス管理のユーティリティ関数

export type TopicStatus = 'unhandled' | 'in-progress' | 'resolved' | 'dismissed';

export interface TopicData {
  id: string;
  title: string;
  category?: string;
  description: string;
  count: number;
  status: TopicStatus;
  statusReason?: string;
  statusUpdatedAt?: number;
  createdAt: number;
  updatedAt: number;
  costEstimate?: number;
  timeEstimate?: string;
  priority?: {
    level: 'low' | 'medium' | 'high';
    reason?: string;
    updatedAt?: number;
    assignee?: string;
  };
}

export const getStatusColor = (status: TopicStatus): string => {
  switch (status) {
    case 'unhandled': return 'bg-red-100 text-red-800';
    case 'in-progress': return 'bg-yellow-100 text-yellow-800';
    case 'resolved': return 'bg-green-100 text-green-800';
    case 'dismissed': return 'bg-gray-100 text-gray-800';
  }
};

// このファイルは国際化対応のため、直接的な翻訳テキストを返す関数は廃止されました
// コンポーネント側で useLanguage() フックと t('projectDetail.topicStatus.xxx') を使用してください
export const getStatusText = (status: TopicStatus): string => {
  console.warn('getStatusText is deprecated. Use useLanguage() hook and t("projectDetail.topicStatus.xxx") instead');
  // 後方互換性のため一時的に保持
  switch (status) {
    case 'unhandled': return '未対応';
    case 'in-progress': return '対応中';
    case 'resolved': return '解決済み';
    case 'dismissed': return '見送り';
  }
};

export const getStatusIcon = (status: TopicStatus): string => {
  switch (status) {
    case 'unhandled': return 'AlertTriangle';
    case 'in-progress': return 'Clock';
    case 'resolved': return 'CheckCircle';
    case 'dismissed': return 'XCircle';
  }
};

export const isArchived = (status: TopicStatus): boolean => {
  return status === 'resolved' || status === 'dismissed';
};

export const isActive = (status: TopicStatus): boolean => {
  return !isArchived(status);
};

export const getActiveStatuses = (): TopicStatus[] => {
  return ['unhandled', 'in-progress'];
};

export const getArchivedStatuses = (): TopicStatus[] => {
  return ['resolved', 'dismissed'];
};

export const getAllStatuses = (): TopicStatus[] => {
  return ['unhandled', 'in-progress', 'resolved', 'dismissed'];
};

// このファイルは国際化対応のため、直接的な翻訳テキストを返す関数は廃止されました
// コンポーネント側で useLanguage() フックと翻訳関数を使用してください
export const getStatusOptions = () => {
  console.warn('getStatusOptions is deprecated. Use useLanguage() hook and translation keys instead');
  // 後方互換性のため一時的に保持
  return [
    { value: 'unhandled', label: '未対応', color: getStatusColor('unhandled') },
    { value: 'in-progress', label: '対応中', color: getStatusColor('in-progress') },
    { value: 'resolved', label: '解決済み', color: getStatusColor('resolved') },
    { value: 'dismissed', label: '見送り', color: getStatusColor('dismissed') }
  ];
};

// 国際化対応: 翻訳関数を受け取ってローカライズされたステータステキストを返す
export const getLocalizedStatusText = (status: TopicStatus, t: (key: string) => string): string => {
  switch (status) {
    case 'unhandled': return t('projectDetail.topicStatus.unhandled');
    case 'in-progress': return t('projectDetail.topicStatus.inProgress');
    case 'resolved': return t('projectDetail.topicStatus.resolved');
    case 'dismissed': return t('projectDetail.topicStatus.dismissed');
  }
};

// 国際化対応: 翻訳関数を受け取ってローカライズされたステータスオプションを返す
export const getLocalizedStatusOptions = (t: (key: string) => string) => {
  return [
    { value: 'unhandled', label: t('projectDetail.topicStatus.unhandled'), color: getStatusColor('unhandled') },
    { value: 'in-progress', label: t('projectDetail.topicStatus.inProgress'), color: getStatusColor('in-progress') },
    { value: 'resolved', label: t('projectDetail.topicStatus.resolved'), color: getStatusColor('resolved') },
    { value: 'dismissed', label: t('projectDetail.topicStatus.dismissed'), color: getStatusColor('dismissed') }
  ];
};

// 大文字小文字を正規化してTopicStatusに変換
export const normalizeTopicStatus = (status: string): TopicStatus => {
  const normalized = status.toLowerCase();
  const validStatuses: TopicStatus[] = ['unhandled', 'in-progress', 'resolved', 'dismissed'];
  
  if (validStatuses.includes(normalized as TopicStatus)) {
    return normalized as TopicStatus;
  }
  
  return 'unhandled'; // デフォルト値
};