"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { locale, setLocale, localeNames, locales } = useLanguage();

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Switch language"
      >
        <Globe className="w-4 h-4" />
        <span>{localeNames[locale]}</span>
      </button>

      <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
              locale === loc
                ? "text-primary-600 font-medium bg-primary-50"
                : "text-gray-700"
            }`}
          >
            {localeNames[loc]}
          </button>
        ))}
      </div>
    </div>
  );
}
