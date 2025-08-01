import { Fragment, ReactNode } from 'react';
import { Brain, ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { AccountMenu } from './AccountMenu';
import { MobileNavigationMenu } from './MobileNavigationMenu';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface MobileAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ResponsiveHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  className?: string;
  actions?: ReactNode;
  mobileActions?: MobileAction[];
  onOpenPurposeSettings?: () => void;
}

export function ResponsiveHeader({ breadcrumbs, className = '', actions, mobileActions, onOpenPurposeSettings }: ResponsiveHeaderProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleBreadcrumbClick = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };

  // Find the previous breadcrumb for back navigation
  const previousBreadcrumb = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;
  const showBackButton = previousBreadcrumb && previousBreadcrumb.path;

  const handleBackClick = () => {
    if (previousBreadcrumb?.path) {
      navigate(previousBreadcrumb.path);
    }
  };

  return (
    <header className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Navigation (visible on small screens) */}
          <div className="md:hidden w-full">
            <div className="flex items-center justify-between">
              {/* Left: Back Button or Spacer */}
              <div className="flex items-center w-16">
                {showBackButton && (
                  <button
                    onClick={handleBackClick}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label={`${t('common.back')} ${previousBreadcrumb?.label}`}
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                )}
              </div>
              
              {/* Center: Service Logo */}
              <div className="flex items-center space-x-2 flex-1 justify-center">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center space-x-2 text-blue-600 hover:opacity-80 transition-opacity"
                  aria-label="ConsensusAI Home"
                >
                  <Brain className="h-6 w-6" />
                  <span className="font-bold text-lg text-gray-800">ConsensusAI</span>
                </button>
              </div>
              
              {/* Right: Mobile Menu */}
              <div className="flex items-center w-16 justify-end">
                <MobileNavigationMenu 
                  breadcrumbs={breadcrumbs} 
                  mobileActions={mobileActions} 
                  onOpenPurposeSettings={onOpenPurposeSettings}
                />
              </div>
            </div>
          </div>

          {/* Desktop Navigation (visible on medium+ screens) */}
          <div className="hidden md:flex items-center justify-between w-full">
            {/* Logo and Breadcrumb */}
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-blue-600 hover:opacity-80 transition-opacity"
                aria-label="ConsensusAI Home"
              >
                <Brain className="h-6 w-6" />
                <span className="font-bold text-lg">ConsensusAI</span>
              </button>

              {/* Breadcrumb */}
              {breadcrumbs.length > 1 && (
                <nav className="flex items-center space-x-2">
                  {breadcrumbs.map((item, index) => (
                    <Fragment key={index}>
                      {index > 0 && (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <button
                        onClick={() => handleBreadcrumbClick(item.path)}
                        disabled={!item.path}
                        className={`
                          text-sm transition-colors
                          ${item.path 
                            ? 'text-gray-600 hover:text-gray-900 cursor-pointer' 
                            : 'text-gray-400 cursor-default'
                          }
                          ${index === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : ''}
                        `}
                      >
                        {item.label}
                      </button>
                    </Fragment>
                  ))}
                </nav>
              )}
            </div>

            {/* Actions and Account Menu */}
            <div className="flex items-center gap-3">
              {actions}
              <AccountMenu onOpenPurposeSettings={onOpenPurposeSettings} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}