import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { SpeedInsights } from "@vercel/speed-insights/next";


export const metadata = {
  title: "Vozniški izpiti",
  description: "Find available driving exam slots in Slovenia.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
