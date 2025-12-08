import React from "react";
import CategoryPageClient from "../../../components/ArtistPageClient";

export default function CategoryPage({ params }) {
  const { slug } = React.use(params);

  return <CategoryPageClient slug={slug} />;
}
