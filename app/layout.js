"use client";

import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { SettingsProvider } from "@/lib/settings";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://t.contentsquare.net/uxa/5ce2d4ab93a5d.js"></script>
      </head>
      <body>
        <SettingsProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <div className="flex-1 flex flex-col">
                {children}
              </div>
              <Footer />
            </div>
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}

