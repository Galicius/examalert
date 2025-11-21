import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Globe, MessageCircleQuestion, Users, Calendar, LogIn, LogOut } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";
import { AuthDialog } from "@/components/auth-dialog";

const translations = {
  sl: {
    title: "Vozniski.si",
    questions: "Vprašanja",
    learning: "Učenje",
    backToSlots: "Nazaj na termine",
    login: "Prijava",
    logout: "Odjava",
    authTitle: "Prijava / Registracija",
    authDescription: "Prijavite se za objavljanje vprašanj in spremljanje napredka.",
    email: "Email",
    password: "Geslo",
    username: "Uporabniško ime",
    register: "Registracija",
  },
  en: {
    title: "Vozniski.si",
    questions: "Questions",
    learning: "Learning",
    backToSlots: "Back to Slots",
    login: "Login",
    logout: "Logout",
    authTitle: "Login / Register",
    authDescription: "Login to post questions and track progress.",
    email: "Email",
    password: "Password",
    username: "Username",
    register: "Register",
  },
};

export function Header() {
  const { darkMode, toggleDarkMode, lang, toggleLang } = useSettings();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [authOpen, setAuthOpen] = useState(false);
  
  const t = translations[lang];
  const showBackToSlots = pathname !== "/";

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bold">{t.title}</h1>
          </Link>
          
          <div className="flex items-center gap-2 flex-wrap">
            {showBackToSlots && (
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{t.backToSlots}</span>
                </Button>
              </Link>
            )}
            
            {pathname !== "/questions" && (
              <Link href="/questions">
                <Button variant="outline" size="sm">
                  <MessageCircleQuestion className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{t.questions}</span>
                </Button>
              </Link>
            )}

            {pathname !== "/learning" && (
              <Link href="/learning">
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{t.learning}</span>
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLang}
              title={lang === "sl" ? "Switch to English" : "Preklopi na slovenščino"}
            >
              <Globe className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {user ? (
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t.logout}</span>
              </Button>
            ) : (
              <Button variant="default" size="sm" onClick={() => setAuthOpen(true)}>
                <LogIn className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t.login}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <AuthDialog 
        open={authOpen} 
        onOpenChange={setAuthOpen}
        translations={t}
      />
    </header>
  );
}
