import ProductDetail from "../../../components/ProductDetailClient";

export default async function ProductPage({ params }) {
  const resolvedParams = await params; // 👈 VIGTIGT

  const productId =
    resolvedParams?.productId ??
    resolvedParams?.productID ??
    resolvedParams?.id ??
    null;

  return <ProductDetail productId={productId} />;
}
