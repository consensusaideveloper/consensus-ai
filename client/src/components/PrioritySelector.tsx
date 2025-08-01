import React, { useState, useRef, useEffect } from 'react';
import { Target, Settings, X, HelpCircle } from 'lucide-react';
import { PriorityModal, Priority, PriorityData } from './PriorityModal';
import { useLanguage } from '../hooks/useLanguage';

interface PrioritySelectorProps {
  priority?: PriorityData | Priority | string;
  onPriorityChange: (level: Priority | undefined) => void;
  onDetailedPriorityChange?: (level: Priority | undefined, reason?: string) => void;
  title?: string;
  subtitle?: string;
  allowNone?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showReasonIcon?: boolean;
  fullWidth?: boolean;
}

export function PrioritySelector({
  priority,
  onPriorityChange,
  onDetailedPriorityChange,
  title,
  subtitle,
  allowNone = true,
  size = 'md',
  showReasonIcon = true,
  fullWidth = false
}: PrioritySelectorProps) {
  const { t } = useLanguage();
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const priorityMenuRef = useRef<HTMLDivElement>(null);
  
  const modalTitle = title || t('prioritySelector.defaultTitle');

  // Normalize priority data
  const priorityData: PriorityData = React.useMemo(() => {
    if (!priority) {
      return { level: undefined };
    }
    
    if (typeof priority === 'string') {
      return { level: priority as Priority };
    }
    
    if (typeof priority === 'object' && 'level' in priority) {
      return priority;
    }
    
    return { level: priority as Priority };
  }, [priority]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(event.target as Node)) {
        setShowPriorityMenu(false);
      }
    };

    if (showPriorityMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPriorityMenu]);

  const getPriorityColor = (level: Priority | undefined) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityText = (level: Priority | undefined) => {
    switch (level) {
      case 'high': return t('prioritySelector.priority.high');
      case 'medium': return t('prioritySelector.priority.medium');
      case 'low': return t('prioritySelector.priority.low');
      default: return t('prioritySelector.priority.unset');
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'px-2 py-1 text-xs',
          icon: 'h-3 w-3',
          spacing: 'mr-1'
        };
      case 'lg':
        return {
          button: 'px-4 py-2 text-base',
          icon: 'h-5 w-5',
          spacing: 'mr-3'
        };
      default:
        return {
          button: 'px-4 py-3 text-sm',
          icon: 'h-4 w-4',
          spacing: 'mr-2'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const handleQuickChange = (level: Priority | undefined) => {
    onPriorityChange(level);
    setShowPriorityMenu(false);
  };

  const handleDetailedChange = (level: Priority | undefined, reason?: string) => {
    if (onDetailedPriorityChange) {
      onDetailedPriorityChange(level, reason);
    } else {
      onPriorityChange(level);
    }
    setShowPriorityModal(false);
  };

  const handleDetailsClick = () => {
    setShowPriorityMenu(false);
    setShowPriorityModal(true);
  };

  return (
    <>
      <div className="relative" ref={priorityMenuRef}>
        <button
          onClick={() => setShowPriorityMenu(!showPriorityMenu)}
          className={`inline-flex items-center justify-between rounded-lg font-medium border cursor-pointer hover:opacity-80 transition-opacity ${getPriorityColor(priorityData.level)} ${sizeClasses.button} ${fullWidth ? 'w-full' : ''}`}
          title={
            priorityData.reason 
              ? t('prioritySelector.tooltips.changePriorityWithReason', { reason: priorityData.reason })
              : t('prioritySelector.tooltips.changePriority')
          }
        >
          <div className="flex items-center">
            <Target className={`${sizeClasses.icon} ${sizeClasses.spacing}`} />
            <span>{getPriorityText(priorityData.level)}</span>
            {showReasonIcon && priorityData.reason && (
              <HelpCircle className={`${sizeClasses.icon} ml-1 text-blue-500`} />
            )}
          </div>
          <Settings className={`${sizeClasses.icon} ml-1`} />
        </button>
        
        {showPriorityMenu && (
          <div className={`absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 ${fullWidth ? 'w-full' : 'min-w-max'}`}>
            <div className="py-1">
              <button
                onClick={() => handleQuickChange('high')}
                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-800 flex items-center"
              >
                <Target className="h-3 w-3 mr-2" />
                {t('prioritySelector.priority.high')}
              </button>
              <button
                onClick={() => handleQuickChange('medium')}
                className="w-full text-left px-3 py-2 text-sm hover:bg-yellow-50 text-yellow-800 flex items-center"
              >
                <Target className="h-3 w-3 mr-2" />
                {t('prioritySelector.priority.medium')}
              </button>
              <button
                onClick={() => handleQuickChange('low')}
                className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 text-green-800 flex items-center"
              >
                <Target className="h-3 w-3 mr-2" />
                {t('prioritySelector.priority.low')}
              </button>
              {allowNone && (
                <button
                  onClick={() => handleQuickChange(undefined)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-600 flex items-center"
                >
                  <X className="h-3 w-3 mr-2" />
                  {t('prioritySelector.priority.none')}
                </button>
              )}
              <div className="border-t border-gray-200 mt-1 pt-1">
                <button
                  onClick={handleDetailsClick}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-blue-800 flex items-center"
                >
                  <Settings className="h-3 w-3 mr-2" />
                  {t('prioritySelector.actions.detailSettings')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Priority Detail Modal */}
      {showPriorityModal && (
        <PriorityModal
          isOpen={showPriorityModal}
          title={modalTitle}
          subtitle={subtitle}
          currentPriority={priorityData}
          allowNone={allowNone}
          onSave={handleDetailedChange}
          onClose={() => setShowPriorityModal(false)}
        />
      )}
    </>
  );
}