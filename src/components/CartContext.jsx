"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = (item, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((p) => p.id === item.id);
      if (existingIndex === -1) {
        return [...prev, { ...item, quantity }];
      }
      const copy = [...prev];
      copy[existingIndex] = {
        ...copy[existingIndex],
        quantity: copy[existingIndex].quantity + quantity,
      };
      return copy;
    });
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => setItems([]);

  const value = {
    items,
    addItem,
    removeItem,
    clearCart,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
