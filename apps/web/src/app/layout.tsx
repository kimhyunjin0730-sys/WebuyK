import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "We buy K",
  description: "Hybrid K-commerce concierge",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
