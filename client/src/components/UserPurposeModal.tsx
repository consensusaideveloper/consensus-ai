import React, { useState } from "react";
import {
  Building2,
  Users,
  MessageSquare,
  CheckCircle,
  Store,
  Briefcase,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";

interface PurposeOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  examples: string[];
  color: string;
}

interface UserPurposeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserPurposeModal({ isOpen, onClose }: UserPurposeModalProps) {
  const { user, updateUserPurpose } = useAuth();
  const { t } = useLanguage();
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(
    user?.purpose || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const purposeOptions: PurposeOption[] = [
    {
      id: "government",
      title: t("userPurpose.government.title"),
      description: t("userPurpose.government.description"),
      icon: Building2,
      examples: [
        t("userPurpose.government.example1"),
        t("userPurpose.government.example2"),
        t("userPurpose.government.example3"),
        t("userPurpose.government.example4"),
      ],
      color: "from-blue-600 to-indigo-600",
    },
    {
      id: "business",
      title: t("userPurpose.business.title"),
      description: t("userPurpose.business.description"),
      icon: Store,
      examples: [
        t("userPurpose.business.example1"),
        t("userPurpose.business.example2"),
        t("userPurpose.business.example3"),
        t("userPurpose.business.example4"),
      ],
      color: "from-emerald-600 to-teal-600",
    },
    {
      id: "corporate",
      title: t("userPurpose.corporate.title"),
      description: t("userPurpose.corporate.description"),
      icon: Briefcase,
      examples: [
        t("userPurpose.corporate.example1"),
        t("userPurpose.corporate.example2"),
        t("userPurpose.corporate.example3"),
        t("userPurpose.corporate.example4"),
      ],
      color: "from-purple-600 to-pink-600",
    },
    {
      id: "community",
      title: t("userPurpose.community.title"),
      description: t("userPurpose.community.description"),
      icon: Users,
      examples: [
        t("userPurpose.community.example1"),
        t("userPurpose.community.example2"),
        t("userPurpose.community.example3"),
        t("userPurpose.community.example4"),
      ],
      color: "from-amber-600 to-orange-600",
    },
    {
      id: "research",
      title: t("userPurpose.research.title"),
      description: t("userPurpose.research.description"),
      icon: MessageSquare,
      examples: [
        t("userPurpose.research.example1"),
        t("userPurpose.research.example2"),
        t("userPurpose.research.example3"),
        t("userPurpose.research.example4"),
      ],
      color: "from-slate-600 to-gray-600",
    },
  ];

  const handleSubmit = async () => {
    if (!selectedPurpose) return;

    setIsSubmitting(true);

    try {
      await updateUserPurpose(selectedPurpose);
      onClose();
    } catch {
      // Failed to update user purpose
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOption = purposeOptions.find(
    (option) => option.id === selectedPurpose
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {t("userPurposeModal.title")}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {t("userPurposeModal.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Purpose Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {purposeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedPurpose === option.id;

              return (
                <div
                  key={option.id}
                  onClick={() => setSelectedPurpose(option.id)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-lg"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                  )}

                  <div className="flex items-center mb-3">
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-r ${option.color} mr-3`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">
                      {option.title}
                    </h3>
                  </div>

                  <p className="text-gray-600 mb-3 leading-relaxed text-sm">
                    {option.description}
                  </p>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 mb-2">
                      {t("userPurposeModal.examples")}：
                    </h4>
                    <ul className="space-y-1">
                      {option.examples.slice(0, 3).map((example, index) => (
                        <li
                          key={index}
                          className="flex items-center text-xs text-gray-600"
                        >
                          <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Purpose Preview */}
          {selectedOption && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 mb-6">
              <div className="flex items-center mb-3">
                <div
                  className={`p-3 rounded-lg bg-gradient-to-r ${selectedOption.color} mr-4`}
                >
                  <selectedOption.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedOption.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {t("userPurposeModal.selected")}
                  </p>
                </div>
              </div>

              <h4 className="font-semibold text-blue-900 mb-3 text-sm">
                {t("userPurposeModal.optimizedFeatures")}：
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center text-blue-800">
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="text-sm">
                    {t("userPurposeModal.feature1")}
                  </span>
                </div>
                <div className="flex items-center text-blue-800">
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="text-sm">
                    {t("userPurposeModal.feature2")}
                  </span>
                </div>
                <div className="flex items-center text-blue-800">
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="text-sm">
                    {t("userPurposeModal.feature3")}
                  </span>
                </div>
                <div className="flex items-center text-blue-800">
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="text-sm">
                    {t("userPurposeModal.feature4")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t("userPurposeModal.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPurpose || isSubmitting}
            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedPurpose && !isSubmitting
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t("userPurposeModal.updating")}
              </div>
            ) : (
              t("userPurposeModal.save")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
