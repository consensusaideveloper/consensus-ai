import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginScreen } from './components/LoginScreen';
import { UserPurposeSelection } from './components/UserPurposeSelection';
import { Dashboard } from './components/Dashboard';
import { NewCollection } from './components/NewCollection';
import { ProjectDetail } from './components/ProjectDetail';
import { ProjectOpinions } from './components/ProjectOpinions';
// 🚧 REFACTORING: ProcessingScreen を削除
// import { ProcessingScreen } from './components/ProcessingScreen';
import { TopicDetail } from './components/TopicDetail';
import { ResponseActionDetail } from './components/ResponseActionDetail';
import { PublicOpinionForm } from './components/PublicOpinionForm';
import { EnhancedDashboard } from './components/EnhancedDashboard';
import { ModernProjectDashboard } from './components/ModernProjectDashboard';
import { ActiveActionsList } from './components/ActiveActionsList';
import { ProjectActionsList } from './components/ProjectActionsList';
import { TermsOfService } from './components/TermsOfService';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { AccountSettings } from './components/AccountSettings';
import { Contact } from './pages/Contact';
import { ScrollToTop } from './components/ScrollToTop';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './components/NotificationToast';
import { useAuth } from './hooks/useAuth';
import { useLanguage } from './hooks/useLanguage';
import { useAnalysisGuard } from './hooks/useAnalysisGuard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function LanguageSync() {
  const { forceSync } = useLanguage();
  const location = useLocation();

  // 画面遷移時に言語同期を強制実行
  useEffect(() => {
    forceSync();
  }, [location.pathname, forceSync]);

  return null;
}

function AppRoutes() {
  const { isAuthenticated, user, loading } = useAuth();
  
  // 分析の堅牢性確保のためのガード
  useAnalysisGuard();

  // Phase 3: 段階的セットアップ完了判定（既存ユーザー保護）
  const isSetupComplete = (user: any) => {
    if (!user) return false;
    
    // 既存ユーザー保護: すでにpurpose設定済みまたはスキップ済みの場合
    // analysisLanguage未設定でもダッシュボードアクセス可能
    const hasPurposeSetup = user.purpose || user.purposeSkipped;
    
    if (hasPurposeSetup) {
      // 既存ユーザー: purpose設定済みならダッシュボードアクセス許可
      // analysisLanguage未設定の場合、Dashboardのモーダルプロンプトで対応
      return true;
    }
    
    // 新規ユーザー: 両方の設定が必要（phase 2のマルチステップ完了）
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
    
      {/* メインルーティング */}
    <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated 
              ? (isSetupComplete(user) ? <Navigate to="/dashboard" /> : <Navigate to="/setup" />)
              : <LoginScreen />
          }
        />
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            {isSetupComplete(user) ? <Navigate to="/dashboard" /> : <UserPurposeSelection />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <AccountSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contact"
        element={
          <ProtectedRoute>
            <Contact />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <EnhancedDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/actions"
        element={
          <ProtectedRoute>
            <ActiveActionsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id/analytics"
        element={
          <ProtectedRoute>
            <ModernProjectDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/new-collection"
        element={
          <ProtectedRoute>
            <NewCollection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <ProjectDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/actions"
        element={
          <ProtectedRoute>
            <ProjectActionsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id/opinions"
        element={
          <ProtectedRoute>
            <ProjectOpinions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id/topics/:topicId"
        element={
          <ProtectedRoute>
            <TopicDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id/topics/:topicId/opinions/:opinionId/action"
        element={
          <ProtectedRoute>
            <ResponseActionDetail />
          </ProtectedRoute>
        }
      />
      {/* 🚧 REFACTORING: ProcessingScreen ルートを削除 */}
      {/* <Route
        path="/projects/:id/processing"
        element={
          <ProtectedRoute>
            <ProcessingScreen />
          </ProtectedRoute>
        }
      /> */}
      {/* Public Opinion Form - No authentication required */}
      <Route
        path="/forms/:uid/:projectId"
        element={<PublicOpinionForm />}
      />
      {/* Legal Pages - No authentication required */}
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route 
        path="/" 
        element={
          isAuthenticated 
            ? (isSetupComplete(user) ? <Navigate to="/dashboard" /> : <Navigate to="/setup" />)
            : <Navigate to="/login" />
        } 
      />
    </Routes>
    </>
  );
}

function AppWithProviders() {
  return (
    <Router>
      <ScrollToTop />
      <LanguageSync />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <AppRoutes />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ToastProvider>
          <ProjectProvider>
            <AppWithProviders />
          </ProjectProvider>
        </ToastProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;