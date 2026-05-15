"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Language } from "@/types";

export default function LanguageSettingsPage() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>("az");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Get saved language from localStorage
    const saved = localStorage.getItem("language") as Language | null;
    if (saved) {
      setCurrentLanguage(saved);
    }
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem("language", lang);
    // Burada i18next üçün locale dəyişmə əmri göndərməlidir
    // Example: i18n.changeLanguage(lang);
  };

  if (!mounted) {
    return null;
  }

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: "az", name: "Azərbaycan", flag: "🇦🇿" },
    { code: "en", name: "English", flag: "🇬🇧" },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Dil Parametrləri
      </h1>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          İnterfeys Dili
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                currentLanguage === lang.code
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900"
                  : "border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700"
              }`}
            >
              <span className="text-3xl">{lang.flag}</span>
              <span
                className={`text-sm font-medium ${
                  currentLanguage === lang.code
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {lang.name}
              </span>
              {currentLanguage === lang.code && (
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  ✓ Seçildi
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Qeyd:</strong> Dil dəyişiklikləri sistem-lərində real-time
            yenilənir
          </p>
        </div>
      </div>
    </div>
  );
}
