import React from "react";
import CategoryPageClient from "../../../components/CategoryPageClient";

export default function CategoryPage({ params }) {
  const { slug } = React.use(params);

  return <CategoryPageClient slug={slug} />;
}
