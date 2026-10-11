import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DTI — Wardrobe Studio",
  description:
    "Find outfit references and free-item recipes for Dress To Impress.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to looks
        </a>
        {children}
      </body>
    </html>
  );
}
