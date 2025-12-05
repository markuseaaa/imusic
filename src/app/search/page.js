import { Suspense } from "react";
import SearchPageClient from "../../components/SearchPageClient";

export default function SearchPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: "32px 24px" }}>Indlæser søgning…</div>}
    >
      <SearchPageClient />
    </Suspense>
  );
}
