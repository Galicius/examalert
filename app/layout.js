"use client";

import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://t.contentsquare.net/uxa/5ce2d4ab93a5d.js"></script>
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

