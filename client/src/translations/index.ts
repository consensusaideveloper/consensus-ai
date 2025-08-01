import { buttonsTranslations } from './common/buttons';
import { statusTranslations } from './common/status';
import { generalTranslations, commonTranslations as generalCommonTranslations } from './common/general';
import { breadcrumbTranslations, commonTranslations } from './common/breadcrumb';
import { plansTranslations } from './common/plans';
import { loginTranslations } from './pages/login';
import { dashboardTranslations } from './pages/dashboard';
import { projectDetailTranslations } from './pages/projectDetail';
import { activeActionsTranslations } from './pages/activeActions';
import { projectActionsTranslations } from './pages/projectActions';
import { modernDashboardTranslations } from './pages/modernDashboard';
import { enhancedDashboardTranslations } from './pages/enhancedDashboard';
import { topicDetailTranslations } from './pages/topicDetail';
import { responseActionDetailTranslations } from './pages/responseActionDetail';
import { projectAnalyticsTranslations } from './pages/projectAnalytics';
import { newCollectionTranslations } from './pages/newCollection';
import { processingTranslations } from './pages/processing';
import { analysisTranslations } from './pages/analysis';
import { tasksTranslations } from './pages/tasks';
import { notificationsTranslations } from './components/notifications';
import { priorityModalTranslations } from './components/priorityModal';
// projectCompletionModalTranslations removed - using simple confirmation
import { prioritySelectorTranslations } from './components/prioritySelector';
import { statusSuggestionBannerTranslations } from './components/statusSuggestionBanner';
import { analysisPreviewDialogTranslations } from './components/analysisPreviewDialog';
import { publicOpinionFormTranslations } from './pages/publicOpinionForm';
import { projectOpinionsTranslations } from './pages/projectOpinions';
import { privacyPolicyTranslations } from './pages/privacyPolicy';
import { termsOfServiceTranslations } from './pages/termsOfService';
import { accountMenu } from './components/accountMenu';
import { userPurpose } from './components/userPurpose';
import { purposeSettingsBanner } from './components/purposeSettingsBanner';
import { analysisStatusTranslations } from './components/analysisStatus';
import { limitDialogTranslations } from './components/limitDialog';
import { topicProtectionBadgeTranslations } from './components/topicProtectionBadge';
import { topicStatusDialogTranslations } from './components/topicStatusDialog';
import { userPurposeSelectionTranslations } from './components/userPurposeSelection';
import { bulkUploadModalTranslations } from './components/bulkUploadModal';
import { accountSettings } from './pages/accountSettings';
import { billingTranslations } from './common/billing';
import { contactTranslations } from './pages/contact';
import { analysisLanguageModalTranslations } from './components/analysisLanguageModal';

export const translations = {
  ja: {
    buttons: buttonsTranslations.ja,
    status: statusTranslations.ja,
    general: generalTranslations.ja,
    breadcrumb: breadcrumbTranslations.ja,
    common: { ...commonTranslations.ja, ...generalCommonTranslations.ja.common, ...plansTranslations.ja.common },
    billing: billingTranslations.ja,
    login: loginTranslations.ja,
    dashboard: dashboardTranslations.ja,
    projectDetail: projectDetailTranslations.ja,
    activeActions: activeActionsTranslations.ja,
    projectActions: projectActionsTranslations.ja,
    modernDashboard: modernDashboardTranslations.ja,
    enhancedDashboard: enhancedDashboardTranslations.ja,
    topicDetail: topicDetailTranslations.ja,
    responseActionDetail: responseActionDetailTranslations.ja,
    projectAnalytics: projectAnalyticsTranslations.ja,
    newCollection: newCollectionTranslations.ja,
    processing: processingTranslations.ja,
    analysis: analysisTranslations.ja,
    tasks: tasksTranslations.ja,
    notifications: notificationsTranslations.ja,
    priorityModal: priorityModalTranslations.ja,
    // projectCompletionModal removed
    prioritySelector: prioritySelectorTranslations.ja,
    statusSuggestionBanner: statusSuggestionBannerTranslations.ja,
    analysisPreviewDialog: analysisPreviewDialogTranslations.ja,
    publicOpinionForm: publicOpinionFormTranslations.ja,
    projectOpinions: projectOpinionsTranslations.ja,
    privacyPolicy: privacyPolicyTranslations.ja,
    termsOfService: termsOfServiceTranslations.ja,
    ...accountMenu.ja,
    ...userPurpose.ja,
    ...purposeSettingsBanner.ja,
    analysisStatus: analysisStatusTranslations.ja,
    ...limitDialogTranslations.ja,
    ...topicProtectionBadgeTranslations.ja,
    ...topicStatusDialogTranslations.ja,
    ...userPurposeSelectionTranslations.ja,
    ...bulkUploadModalTranslations.ja,
    ...accountSettings.ja,
    ...contactTranslations.ja,
    ...analysisLanguageModalTranslations.ja,
  },
  en: {
    buttons: buttonsTranslations.en,
    status: statusTranslations.en,
    general: generalTranslations.en,
    breadcrumb: breadcrumbTranslations.en,
    common: { ...commonTranslations.en, ...generalCommonTranslations.en.common, ...plansTranslations.en.common },
    billing: billingTranslations.en,
    login: loginTranslations.en,
    dashboard: dashboardTranslations.en,
    projectDetail: projectDetailTranslations.en,
    activeActions: activeActionsTranslations.en,
    projectActions: projectActionsTranslations.en,
    modernDashboard: modernDashboardTranslations.en,
    enhancedDashboard: enhancedDashboardTranslations.en,
    topicDetail: topicDetailTranslations.en,
    responseActionDetail: responseActionDetailTranslations.en,
    projectAnalytics: projectAnalyticsTranslations.en,
    newCollection: newCollectionTranslations.en,
    processing: processingTranslations.en,
    analysis: analysisTranslations.en,
    tasks: tasksTranslations.en,
    notifications: notificationsTranslations.en,
    priorityModal: priorityModalTranslations.en,
    // projectCompletionModal removed
    prioritySelector: prioritySelectorTranslations.en,
    statusSuggestionBanner: statusSuggestionBannerTranslations.en,
    analysisPreviewDialog: analysisPreviewDialogTranslations.en,
    publicOpinionForm: publicOpinionFormTranslations.en,
    projectOpinions: projectOpinionsTranslations.en,
    privacyPolicy: privacyPolicyTranslations.en,
    termsOfService: termsOfServiceTranslations.en,
    ...accountMenu.en,
    ...userPurpose.en,
    ...purposeSettingsBanner.en,
    analysisStatus: analysisStatusTranslations.en,
    ...limitDialogTranslations.en,
    ...topicProtectionBadgeTranslations.en,
    ...topicStatusDialogTranslations.en,
    ...userPurposeSelectionTranslations.en,
    ...bulkUploadModalTranslations.en,
    ...accountSettings.en,
    ...contactTranslations.en,
    ...analysisLanguageModalTranslations.en,
  }
};

export type Language = 'ja' | 'en';