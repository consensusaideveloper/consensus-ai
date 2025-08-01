import { useState } from "react";
import { LogOut, FileText, Shield, Globe, User, Crown, Target, Settings, MessageSquare } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { PLAN_TYPES } from "../constants/planTypes";

// Constants
const STRIPE_PAYMENT_URL = import.meta.env.VITE_STRIPE_PAYMENT_URL || 'https://buy.stripe.com/test_9B6eVdc3D4Cp52ccflaIM01';
const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || 'price_1RnZ6qEOZJMIcvctX9z0VHZJ';

interface MobileAccountMenuProps {
  className?: string;
  onClose?: () => void;
  onOpenPurposeSettings?: () => void;
}

export function MobileAccountMenu({
  className = "",
  onClose,
  onOpenPurposeSettings,
}: MobileAccountMenuProps) {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [avatarError, setAvatarError] = useState(false);

  if (!user) {
    return null;
  }

  const handleLanguageToggle = async () => {
    const newLanguage = language === "ja" ? "en" : "ja";
    try {
      await setLanguage(newLanguage);
    } catch {
      // Language switching error
    }
  };

  const handleLogout = () => {
    onClose?.();
    logout();
  };

  const handleExternalLink = (url: string) => {
    onClose?.();
    window.open(url, "_blank", "noopener,noreferrer");
  };

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
    onClose?.();
    
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

  const handlePurposeSettings = () => {
    onClose?.();
    onOpenPurposeSettings?.();
  };

  const handleAccountSettings = () => {
    onClose?.();
    navigate('/account');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* User Info - Clickable to go to Account Settings */}
      <button
        onClick={handleAccountSettings}
        className="w-full flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {!user?.avatar || avatarError ? (
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
        ) : (
          <img
            src={user.avatar}
            alt={user.name}
            className="h-8 w-8 rounded-full flex-shrink-0"
            onError={() => {
              setAvatarError(true);
            }}
          />
        )}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-xs font-medium text-gray-900 truncate">
            {user?.name}
          </div>
          <div className="text-xs text-gray-500 truncate">{user?.email}</div>
        </div>
        <Settings className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </button>

      {/* Menu Items */}
      <div className="space-y-1">
        {/* Language Toggle */}
        <button
          onClick={handleLanguageToggle}
          className="w-full flex items-center justify-between p-2 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center">
            <Globe className="h-4 w-4 mr-2" />
            <span>{t("dashboard.userMenu.language")}</span>
          </div>
          <span className="text-xs bg-gray-200 px-2 py-1 rounded-full font-medium">
            {language === "ja" ? "JP" : "EN"}
          </span>
        </button>

        {/* User Purpose Settings */}
        <button
          onClick={handlePurposeSettings}
          className="w-full flex items-center justify-between p-2 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center">
            <Target className="h-4 w-4 mr-2" />
            <span>{t("accountMenu.purposeSettings.title")}</span>
          </div>
          <span className="text-xs text-gray-500 truncate max-w-[100px]">
            {getPurposeDisplayText(user.purpose)}
          </span>
        </button>

        {/* プランステータス表示 */}
        {user.subscriptionStatus === PLAN_TYPES.PRO ? (
          <div className="flex items-center p-2 my-1 text-xs bg-green-50 border border-green-200 rounded-lg">
            <Crown className="h-4 w-4 mr-2 text-green-600 flex-shrink-0" />
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
            className="w-full flex items-center justify-between p-2 text-xs text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <Crown className="h-4 w-4 mr-2 text-blue-600" />
              <div className="text-left">
                <div className="font-medium">{t("accountMenu.upgrade.title")}</div>
                <div className="text-xs text-blue-600 mt-0.5">
                  {t("accountMenu.upgrade.subtitle")}
                </div>
              </div>
            </div>
          </button>
        )}

        <div className="border-t border-gray-200 my-1"></div>

        {/* Terms of Service */}
        <button
          onClick={() => handleExternalLink("/terms")}
          className="w-full flex items-center p-2 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FileText className="h-4 w-4 mr-2" />
          {t("dashboard.userMenu.termsOfService")}
        </button>

        {/* Privacy Policy */}
        <button
          onClick={() => handleExternalLink("/privacy")}
          className="w-full flex items-center p-2 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Shield className="h-4 w-4 mr-2" />
          {t("dashboard.userMenu.privacyPolicy")}
        </button>

        {/* Contact */}
        <button
          onClick={() => {
            onClose?.();
            navigate("/contact");
          }}
          className="w-full flex items-center p-2 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {t("contact.title")}
        </button>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center p-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t("dashboard.userMenu.signOut")}
        </button>
      </div>
    </div>
  );
}
