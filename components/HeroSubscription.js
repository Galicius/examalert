"use client";

import { Button } from "@/components/ui/button";
import { Mail, Bell } from "lucide-react";
import { useSettings } from "@/lib/settings";

const translations = {
  sl: {
    heroTitle: "Hitreje se prijavi na izpit",
    heroSubtitle: "Prejemajte takojšnja obvestila, ko se sprosti termin za vozniški izpit v vašem kraju.",
    subscribe: "Naroči se na obvestila",
    features: [
      "Takojšnja e-poštna obvestila",
      "Filtriranje po lokaciji in tipu izpita",
      "Brezplačna uporaba"
    ]
  },
  en: {
    heroTitle: "Book you exam fast",
    heroSubtitle: "Get instant notifications when a driving exam slot becomes available in your area.",
    subscribe: "Subscribe to Notifications",
    features: [
      "Instant email notifications",
      "Filter by location and exam type",
      "Free to use"
    ]
  },
};

export function HeroSubscription({ onSubscribeClick }) {
  const { lang } = useSettings();
  const t = translations[lang];

  return (
    <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border mb-8">
      <div className="container mx-auto px-4 py-12 sm:py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">

          
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            {t.heroTitle}
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.heroSubtitle}
          </p>
          
          <div className="pt-4">
            <Button size="lg" onClick={onSubscribeClick} className="text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              <Mail className="mr-2 h-5 w-5" />
              {t.subscribe}
            </Button>
          </div>

          <div className="pt-8 flex flex-wrap justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
            {t.features.map((feature, index) => (
              <div key={index} className="flex items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
