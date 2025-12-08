import SharedWishlistPageClient from "../../../components/SharedWishlistPageClient";

export default function SharedWishlistPage({ params }) {
  const { userId } = params;

  return <SharedWishlistPageClient userId={userId} />;
}
