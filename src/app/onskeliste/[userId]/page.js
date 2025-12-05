import SharedWishlistPageClient from "../../../components/SharedWishlistPageClient";

export default function SharedWishlistPage({ params }) {
  // 👇 dette navn SKAL matche mappen [userId]
  const { userId } = params;

  return <SharedWishlistPageClient userId={userId} />;
}
