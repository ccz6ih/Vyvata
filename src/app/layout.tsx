import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Vyvata — Personalized Wellness Protocols, Powered by Intelligence",
  description:
    "Your AI-powered wellness guide. Answer a few questions, get a personalized supplement protocol and lifestyle plan — built for your goals. Free. Under 60 seconds.",
  openGraph: {
    title: "Vyvata",
    description: "Personalized wellness protocols, powered by intelligence.",
    type: "website",
    siteName: "Vyvata",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vyvata",
    description: "Your AI-powered wellness protocol. Built for you in 60 seconds.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#112040",
              border: "1px solid rgba(201, 214, 223, 0.15)",
              color: "#FFFFFF",
            },
          }}
        />
      </body>
    </html>
  );
}
