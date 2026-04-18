import { Metadata } from "next";
import ProtocolClient from "./ProtocolClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `My Wellness Protocol — Vyvata`,
    description: "Personalized supplement protocol — what's working, what to drop, what to add.",
    openGraph: {
      title: `My Vyvata Protocol`,
      description: "AI-powered personalized wellness protocol. Built in 60 seconds.",
      images: [`/api/og?slug=${slug}`],
      siteName: "Vyvata",
    },
    twitter: {
      card: "summary_large_image",
      title: "My Vyvata Protocol",
      description: "See my personalized supplement protocol.",
    },
  };
}

export default async function ProtocolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProtocolClient slug={slug} />;
}
