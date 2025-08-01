import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Brain, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { MobileAccountMenu } from './MobileAccountMenu';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface MobileAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface MobileNavigationMenuProps {
  breadcrumbs: BreadcrumbItem[];
  mobileActions?: MobileAction[];
  className?: string;
  onOpenPurposeSettings?: () => void;
}

export function MobileNavigationMenu({ breadcrumbs, mobileActions, className = '', onOpenPurposeSettings }: MobileNavigationMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const scrollableRef = useRef<HTMLDivElement>(null);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [breadcrumbs]);

  // Handle outside click and body scroll management
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (isOpen && !(event.target as Element).closest('.mobile-nav-container')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      
      // Simple and reliable approach: add CSS class to body
      document.body.classList.add('mobile-menu-open');
    } else {
      // Remove CSS class from body
      document.body.classList.remove('mobile-menu-open');
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      // Always clean up the class
      document.body.classList.remove('mobile-menu-open');
    };
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('mobile-menu-open');
    };
  }, []);

  const handleBreadcrumbClick = (path?: string) => {
    if (path) {
      navigate(path);
      setIsOpen(false);
    }
  };

  const handleMobileActionClick = (action: MobileAction) => {
    action.onClick();
    setIsOpen(false);
  };

  const getActionButtonClasses = (variant?: string) => {
    const baseClasses = "w-full flex items-center text-left p-3 rounded-lg transition-all duration-200 hover:shadow-sm";
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
      case 'danger':
        return `${baseClasses} bg-red-50 text-red-700 hover:bg-red-100`;
      case 'secondary':
      default:
        return `${baseClasses} bg-gray-50 text-gray-700 hover:bg-gray-100`;
    }
  };

  return (
    <div className={`mobile-nav-container ${className}`}>
      {/* Hamburger Menu Button Only */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label={isOpen ? t('common.close') : t('common.menu')}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-gray-600" />
        ) : (
          <Menu className="h-6 w-6 text-gray-600" />
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side Menu */}
      <div 
        className={`fixed top-0 right-0 h-full w-[320px] max-w-[90vw] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Menu Header - Fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">ConsensusAI</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Scrollable Content - All content scrollable */}
        <div 
          ref={scrollableRef}
          className="mobile-nav-scrollable flex-1 overflow-y-auto pb-6"
          style={{
            maxHeight: 'calc(100vh - 80px)', // Account for header height with new padding
            scrollbarWidth: 'thin',
            scrollbarColor: '#D1D5DB #F3F4F6',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Breadcrumb Navigation */}
          <div className="px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
              <ChevronRight className="h-4 w-4 mr-2 text-blue-600" />
              {t('common.navigation')}
            </h3>
            <nav className="space-y-1">
              {breadcrumbs.map((item, index) => {
                const isCurrentPage = index === breadcrumbs.length - 1;
                const isClickable = item.path && !isCurrentPage;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleBreadcrumbClick(item.path)}
                    disabled={!isClickable}
                    className={`
                      w-full flex items-center text-left p-3 rounded-lg transition-all duration-200
                      ${isCurrentPage 
                        ? 'bg-blue-600 text-white shadow-md font-semibold cursor-default' 
                        : isClickable
                          ? 'hover:bg-blue-50 hover:text-blue-700 text-gray-700 cursor-pointer hover:shadow-sm' 
                          : 'text-gray-500 cursor-default'
                      }
                      ${index === 0 ? 'ml-0' : 'ml-4'}
                    `}
                  >
                    {index > 0 && (
                      <ChevronRight className={`h-4 w-4 mr-3 ${
                        isCurrentPage ? 'text-blue-200' : 'text-blue-400'
                      }`} />
                    )}
                    <span className={`flex-1 ${isCurrentPage ? 'text-sm font-semibold' : 'text-sm'}`}>
                      {item.label}
                    </span>
                    {isCurrentPage && (
                      <div className="w-2 h-2 bg-white rounded-full ml-2 opacity-80"></div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Page Actions Section - only show if actions exist */}
          {mobileActions && mobileActions.length > 0 && (
            <>
              {/* Divider */}
              <div className="border-t border-gray-200 mx-6"></div>

              <div className="px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                  <svg className="h-4 w-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t('common.pageActions')}
                </h3>
                <nav className="space-y-2">
                  {mobileActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleMobileActionClick(action)}
                      className={getActionButtonClasses(action.variant)}
                    >
                      <span className="mr-3">{action.icon}</span>
                      <span className="text-sm font-medium flex-1">{action.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 mx-6"></div>

          {/* Help & Information Section */}
          <div className="px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
              <svg className="h-4 w-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('common.helpAndInfo')}
            </h3>
            <nav className="space-y-2">
              <button
                onClick={() => {
                  window.open('/help', '_blank', 'noopener,noreferrer');
                  setIsOpen(false);
                }}
                className="w-full flex items-center text-left p-3 rounded-lg hover:bg-green-50 hover:text-green-700 text-gray-700 transition-all duration-200 hover:shadow-sm"
              >
                <span className="text-sm font-medium">{t('common.help')}</span>
                <svg className="h-4 w-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              <button
                onClick={() => {
                  window.open('/faq', '_blank', 'noopener,noreferrer');
                  setIsOpen(false);
                }}
                className="w-full flex items-center text-left p-3 rounded-lg hover:bg-green-50 hover:text-green-700 text-gray-700 transition-all duration-200 hover:shadow-sm"
              >
                <span className="text-sm font-medium">{t('common.faq')}</span>
                <svg className="h-4 w-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              <button
                onClick={() => {
                  window.open('/contact', '_blank', 'noopener,noreferrer');
                  setIsOpen(false);
                }}
                className="w-full flex items-center text-left p-3 rounded-lg hover:bg-green-50 hover:text-green-700 text-gray-700 transition-all duration-200 hover:shadow-sm"
              >
                <span className="text-sm font-medium">{t('common.contact')}</span>
                <svg className="h-4 w-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </nav>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 mx-6"></div>

          {/* Account Section - Now scrollable */}
          <div className="px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
              <svg className="h-4 w-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t('dashboard.userMenu.account')}
            </h3>
            <MobileAccountMenu 
              onClose={() => setIsOpen(false)} 
              onOpenPurposeSettings={onOpenPurposeSettings}
            />
          </div>
        </div>
      </div>
    </div>
  );
}