import { useState, useRef, useEffect } from "react";
import {
  LogOut,
  FileText,
  Shield,
  Globe,
  ChevronDown,
  Target,
  User,
  Crown,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { PLAN_TYPES } from "../constants/planTypes";

// Constants - Stripe Checkout now handled via /api/billing/create-checkout-session
const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || 'price_1RnZ6qEOZJMIcvctX9z0VHZJ';

interface AccountMenuProps {
  className?: string;
  onOpenPurposeSettings?: () => void;
}

export function AccountMenu({
  className = "",
  onOpenPurposeSettings,
}: AccountMenuProps) {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Avatar表示用のコンポーネント
  const AvatarDisplay = ({
    size,
    className,
  }: {
    size: "sm" | "md";
    className?: string;
  }) => {
    const sizeClasses = size === "sm" ? "h-8 w-8" : "h-10 w-10";
    const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

    if (!user?.avatar || avatarError) {
      return (
        <div
          className={`${sizeClasses} rounded-full bg-blue-500 flex items-center justify-center ${
            className || ""
          }`}
        >
          <User className={`${iconSize} text-white`} />
        </div>
      );
    }

    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={`${sizeClasses} rounded-full ${className || ""}`}
        onError={() => {
          setAvatarError(true);
        }}
      />
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  if (!user) {
    return null;
  }

  const getPurposeDisplayText = (purpose?: string) => {
    if (!purpose) return t("accountMenu.purposeSettings.notSet");

    const purposeMap: Record<string, string> = {
      government: t("accountMenu.purposeSettings.government"),
      business: t("accountMenu.purposeSettings.business"),
      corporate: t("accountMenu.purposeSettings.corporate"),
      community: t("accountMenu.purposeSettings.community"),
      research: t("accountMenu.purposeSettings.research"),
    };

    return purposeMap[purpose] || purpose;
  };

  const handleUpgradeClick = async () => {
    setShowUserMenu(false);
    
    try {
      // Checkout Session APIを使用してuserIdを渡す
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          priceId: STRIPE_PRICE_ID,
          successUrl: `${window.location.origin}/dashboard?upgrade=success`,
          cancelUrl: `${window.location.origin}/dashboard?upgrade=cancelled`,
          enableTrial: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create checkout session');
      }

      const data = await response.json();
      
      if (data.url) {
        // Stripeのチェックアウトページにリダイレクト
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert(t('billing.error') || 'An error occurred. Please try again.');
    }
  };

  return (
    <div className={`relative ${className}`} ref={userMenuRef}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        title={`${user?.name} - ${t("dashboard.userMenu.openMenu")}`}
      >
        <AvatarDisplay size="sm" />
        {/* Small indicator for dropdown */}
        <ChevronDown
          className={`absolute -bottom-1 -right-1 h-3 w-3 text-gray-500 bg-white rounded-full border border-gray-200 transition-transform ${
            showUserMenu ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {showUserMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info Header - Clickable to go to Account Settings */}
          <button
            onClick={() => {
              setShowUserMenu(false);
              navigate('/account');
            }}
            className="w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <AvatarDisplay size="md" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {user?.name}
                </div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
            </div>
          </button>

          {/* Menu Items */}
          <div className="py-1">
            {/* Language Toggle */}
            <button
              onClick={async () => {
                const newLanguage = language === "ja" ? "en" : "ja";
                setShowUserMenu(false);
                try {
                  await setLanguage(newLanguage);
                } catch {
                  // Language change failed
                }
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Globe className="h-4 w-4 mr-3" />
              <span className="flex-1 text-left">
                {t("dashboard.userMenu.language")}
              </span>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full font-medium">
                {language === "ja" ? "JP" : "EN"}
              </span>
            </button>

            {/* User Purpose Settings */}
            <button
              onClick={() => {
                setShowUserMenu(false);
                onOpenPurposeSettings?.();
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Target className="h-4 w-4 mr-3" />
              <div className="flex-1 text-left">
                <div>{t("accountMenu.purposeSettings.title")}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {getPurposeDisplayText(user.purpose)}
                </div>
              </div>
            </button>

            {/* プランステータス表示 */}
            {user.subscriptionStatus === PLAN_TYPES.PRO ? (
              <div className="flex items-center px-4 py-2 mx-4 my-1 text-sm bg-green-50 border border-green-200 rounded-lg">
                <Crown className="h-4 w-4 mr-3 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-green-800 truncate">{t("accountMenu.plan.pro")}</div>
                  <div className="text-xs text-green-600 mt-0.5 truncate">
                    {t("accountMenu.plan.active")}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleUpgradeClick}
                className="w-full flex items-center px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
              >
                <Crown className="h-4 w-4 mr-3 text-blue-600" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{t("accountMenu.upgrade.title")}</div>
                  <div className="text-xs text-blue-600 mt-0.5">
                    {t("accountMenu.upgrade.subtitle")}
                  </div>
                </div>
              </button>
            )}

            <div className="border-t border-gray-100 my-1"></div>

            <button
              onClick={() => {
                setShowUserMenu(false);
                window.open("/terms", "_blank", "noopener,noreferrer");
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <FileText className="h-4 w-4 mr-3" />
              {t("dashboard.userMenu.termsOfService")}
            </button>

            <button
              onClick={() => {
                setShowUserMenu(false);
                window.open("/privacy", "_blank", "noopener,noreferrer");
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Shield className="h-4 w-4 mr-3" />
              {t("dashboard.userMenu.privacyPolicy")}
            </button>

            <button
              onClick={() => {
                setShowUserMenu(false);
                navigate("/contact");
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <MessageSquare className="h-4 w-4 mr-3" />
              {t("contact.title")}
            </button>

            <div className="border-t border-gray-100 my-1"></div>

            <button
              onClick={() => {
                setShowUserMenu(false);
                logout();
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-3" />
              {t("dashboard.userMenu.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
