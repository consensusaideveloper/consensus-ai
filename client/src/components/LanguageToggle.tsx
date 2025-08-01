import { Globe } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="relative">
      <button
        onClick={() => setLanguage(language === "ja" ? "en" : "ja")}
        className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title={language === "ja" ? "Switch to English" : "日本語に切り替え"}
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm font-medium">
          {language === "ja" ? "EN" : "JP"}
        </span>
      </button>
    </div>
  );
}
