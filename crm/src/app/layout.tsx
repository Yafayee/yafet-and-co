import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CP Consulting CRM",
  description: "Customer relationship and communication platform",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body>{children}</body>
    </html>
  );
}
