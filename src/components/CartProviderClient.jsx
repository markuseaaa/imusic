"use client";

import { CartProvider } from "./CartContext";

export default function CartProviderClient({ children }) {
  return <CartProvider>{children}</CartProvider>;
}
