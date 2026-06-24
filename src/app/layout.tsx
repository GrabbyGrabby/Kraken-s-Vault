import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrabDocs Vault - Client-Side Encrypted Credential Manager",
  description: "Securely store passwords, credit cards, identities (like PAN cards), and secure notes using client-side zero-knowledge AES-256-GCM encryption. Includes standard & Web3 wallet sign key derivation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="gradient-bg">
        {children}
      </body>
    </html>
  );
}
