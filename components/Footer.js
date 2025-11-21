"use client";

import { useSettings } from "@/lib/settings";

const translations = {
  sl: {
    copyright: "© 2024 ExamAlert. Vse pravice pridržane.",
    privacy: "Zasebnost",
    terms: "Pogoji uporabe",
    contact: "Kontakt",
  },
  en: {
    copyright: "© 2024 ExamAlert. All rights reserved.",
    privacy: "Privacy",
    terms: "Terms",
    contact: "Contact",
  },
};

export function Footer() {
  const { lang } = useSettings();
  const t = translations[lang];

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>{t.copyright}</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">{t.privacy}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t.terms}</a>
            <a href="mailto:info@examalert.si" className="hover:text-foreground transition-colors">{t.contact}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
