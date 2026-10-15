import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MarketingHome from "@/components/marketing-home";

export const metadata: Metadata = {
  title: "Mykos Research Labs | Agent Memory",
  description: "Experimental local-first memory for coding agents, with source-grounded findings and checked-result reuse bound to declared evidence.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params.c || params.brandId || params.view === "workspace") {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
      else if (value !== undefined) query.set(key, value);
    }
    redirect(`/workspace?${query.toString()}`);
  }
  return <MarketingHome />;
}
