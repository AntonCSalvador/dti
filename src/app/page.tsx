import { loadCatalog } from "@/lib/catalog/load";
import { Stylist } from "@/components/stylist";
import { providerStatus } from "@/lib/providers";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <Stylist catalog={loadCatalog()} providers={providerStatus()} />;
}
