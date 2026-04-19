import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getAppBaseUrl } from "@/lib/urls";

export const metadata: Metadata = {
  metadataBase: new URL(getAppBaseUrl()),
  title: "Vyvata — The Independent Integrity Score for What You Put in Your Body",
  description:
    "Evidence-graded. Compliance-checked. Accountable to you, not the brands being scored. Build your personalized supplement protocol in 60 seconds.",
  openGraph: {
    title: "Vyvata — The Integrity Score for Supplements",
    description: "Independent integrity scores for supplements and wellness products. Evidence-graded. Compliance-checked. Built to be accountable to you.",
    type: "website",
    siteName: "Vyvata",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vyvata — The Integrity Score for Supplements",
    description: "Independent integrity scores for supplements and wellness products. Evidence-graded. Compliance-checked. Built to be accountable to you.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
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
