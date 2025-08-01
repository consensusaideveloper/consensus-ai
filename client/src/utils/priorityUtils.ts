import { Priority } from '../components/PriorityModal';

// 国際化対応: 翻訳関数を受け取ってローカライズされた優先度テキストを返す
export const getLocalizedPriorityText = (priority: Priority | undefined, t: (key: string) => string): string => {
  switch (priority) {
    case 'high': return t('responseActionDetail.priority.high');
    case 'medium': return t('responseActionDetail.priority.medium');
    case 'low': return t('responseActionDetail.priority.low');
    default: return t('responseActionDetail.priority.none');
  }
};

// 後方互換性のため保持（廃止予定）
export const getPriorityText = (priority: Priority | undefined): string => {
  console.warn('getPriorityText is deprecated. Use getLocalizedPriorityText with translation function instead');
  switch (priority) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return '優先度未設定';
  }
};

export const getPriorityFullText = (priority: Priority | undefined): string => {
  switch (priority) {
    case 'high': return '高優先度';
    case 'medium': return '中優先度';
    case 'low': return '低優先度';
    default: return '優先度未設定';
  }
};

export const getPriorityColor = (priority: Priority | undefined): string => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getPriorityBadgeColor = (priority: Priority | undefined): string => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getPriorityHoverColor = (priority: Priority | undefined): string => {
  switch (priority) {
    case 'high': return 'hover:bg-red-50';
    case 'medium': return 'hover:bg-yellow-50';
    case 'low': return 'hover:bg-green-50';
    default: return 'hover:bg-gray-50';
  }
};