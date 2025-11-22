"use client";

import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { SettingsProvider } from "@/lib/settings";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Vozniski.si - Termini za Vozniški Izpit</title>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <script src="https://t.contentsquare.net/uxa/5ce2d4ab93a5d.js"></script>
      </head>
      <body>
        <SettingsProvider>
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "mock-client-id"}>
            <AuthProvider>
              <div className="flex flex-col min-h-screen">
                <Header />
                <div className="flex-1 flex flex-col">
                  {children}
                </div>
                <Footer />
              </div>
            </AuthProvider>
          </GoogleOAuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
