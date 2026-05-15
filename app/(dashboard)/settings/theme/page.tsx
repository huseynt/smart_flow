"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Theme } from "@/types";

export default function ThemeSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] =
    [
      {
        value: "light",
        label: "Açıq Tema",
        icon: <Sun className="h-5 w-5" />,
      },
      {
        value: "dark",
        label: "Tünd Tema",
        icon: <Moon className="h-5 w-5" />,
      },
      {
        value: "system",
        label: "Sistem Ayarı",
        icon: <Monitor className="h-5 w-5" />,
      },
    ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Tema Parametrləri
      </h1>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Görünüş Modu
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                theme === option.value
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900"
                  : "border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700"
              }`}
            >
              <div
                className={`${
                  theme === option.value
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {option.icon}
              </div>
              <span
                className={`text-sm font-medium ${
                  theme === option.value
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {option.label}
              </span>
              {theme === option.value && (
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  ✓ Aktiv
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <p className="text-sm text-indigo-900 dark:text-indigo-200">
            <strong>Sistem Ayarı:</strong> Operasion sistemin görünüş
            ayarlarını izləyir
          </p>
        </div>
      </div>
    </div>
  );
}
