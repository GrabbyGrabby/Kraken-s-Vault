import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kraken's Vault | Client Side Encryption Storage",
  description: "Securely store passwords, credit cards, identities (like PAN cards), and secure notes using client-side high-security AES-256-GCM encryption. Includes standard & Web3 wallet sign key derivation.",
  icons: {
    icon: [
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const theme = localStorage.getItem('vault_theme') || 'theme-ocean';
                document.documentElement.className = theme;
              } catch (e) {}
            })();
          `
        }} />
      </head>
      <body className="gradient-bg">
        {children}
      </body>
    </html>
  );
}
