import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HRM - HQ Group",
  description: "Phần mềm quản trị nhân sự HQ Group",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
