import React from "react";
import CategoryPageClient from "../../../components/CategoryPageClient";

export default function CategoryPage({ params }) {
  // Next 15: params er en Promise → brug React.use
  const { slug } = React.use(params);

  return <CategoryPageClient slug={slug} />;
}
