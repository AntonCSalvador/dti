import { loadCatalog } from "@/lib/catalog/load";
import { Stylist } from "@/components/stylist";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Stylist
      catalog={loadCatalog()}
      providers={{
        openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
        search: Boolean(process.env.SERPAPI_API_KEY?.trim()),
      }}
    />
  );
}
