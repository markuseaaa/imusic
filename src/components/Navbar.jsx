"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./Navbar.module.css";
import { useCart } from "./CartContext";
import { auth, db } from "@/../firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { ref, push, set } from "firebase/database";

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [user, setUser] = useState(null);
  const router = useRouter();
  const [cartOpen, setCartOpen] = useState(false);

  const { items, totalQuantity, totalPrice, clearCart, removeItem } = useCart();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
    });
    return () => unsub();
  }, []);

  const handleSearch = () => {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    // Ikke logget ind → send til konto
    if (!user) {
      setCartOpen(false);
      router.push("/konto");
      return;
    }

    try {
      const ordersRef = ref(db, `orders/${user.uid}`);
      const newOrderRef = push(ordersRef);

      await set(newOrderRef, {
        createdAt: Date.now(),
        status: "received",
        total: totalPrice,
        shipping: "standard", // så du har noget i order.shipping
        items: items.map((i) => ({
          productId: i.id,
          title: i.title,
          price: i.price,
          quantity: i.quantity,
          image: i.image || null,
          versionName: i.versionName || null,
          versionCode: i.versionCode || null,
        })),
      });

      clearCart();
      setCartOpen(false);
      router.push("/profil"); // evt. /profil?tab=orders
    } catch (err) {
      console.error("Fejl ved oprettelse af ordre", err);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* LEFT — LOGO */}
        <Link href="/" className={styles.logo}>
          <Image
            src="/icons/imusiclogo.png"
            alt="iMusic logo"
            width={110}
            height={30}
            priority
          />
        </Link>

        {/* CENTER — NAV LINKS */}
        <nav className={styles.nav}>
          <Link href="/" className={styles.active}>
            K-POP
          </Link>
          <Link href="/cd">CD’ER</Link>
          <Link href="/vinyl">VINYL</Link>
          <Link href="/film">FILM</Link>
          <Link href="/books">BØGER</Link>
          <Link href="/merch">MERCHANDISE</Link>
        </nav>

        {/* RIGHT — ICONS */}
        <div className={styles.actions}>
          {/* SEARCH ICON TOGGLE */}
          <button
            className={styles.iconButton}
            onClick={() => setSearchOpen((prev) => !prev)}
          >
            <Image src="/icons/search.svg" alt="Søg" width={22} height={22} />
          </button>

          <button className={styles.iconButton}>
            <Image
              src="/icons/currency.svg"
              alt="Valuta"
              width={24}
              height={24}
            />
          </button>

          <button
            className={styles.iconButton}
            onClick={() => {
              if (user) {
                router.push("/profil");
              } else {
                router.push("/konto");
              }
            }}
          >
            <Image
              src="/icons/profile.svg"
              alt="Profil"
              width={22}
              height={22}
            />
          </button>

          <button
            className={styles.iconButton}
            onClick={() => setCartOpen(true)}
          >
            <div className={styles.basketWrapper}>
              <Image
                src="/icons/basket.svg"
                alt="Kurv"
                width={24}
                height={24}
              />
              {totalQuantity > 0 && (
                <span className={styles.basketBadge}>{totalQuantity}</span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* SEARCH BAR UNDER WHOLE NAVBAR */}
      {searchOpen && (
        <div className={styles.searchBar}>
          <div className={styles.searchInner}>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Søg efter produkter..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Image
                src="/icons/search.svg"
                alt="Udfør søgning"
                width={20}
                height={20}
                className={styles.searchIcon}
                onClick={handleSearch}
              />
            </div>
          </div>
        </div>
      )}
      {cartOpen && (
        <div className={styles.cartOverlay} onClick={() => setCartOpen(false)}>
          <div
            className={styles.cartModal}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.cartTitle}>Din kurv</h2>

            {items.length === 0 ? (
              <p className={styles.cartEmpty}>Din kurv er tom.</p>
            ) : (
              <>
                <ul className={styles.cartList}>
                  {items.map((item) => (
                    <li key={item.id} className={styles.cartItem}>
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.title}
                          width={60}
                          height={60}
                          className={styles.cartItemImage}
                        />
                      )}

                      <div className={styles.cartItemText}>
                        <p className={styles.cartItemTitle}>{item.title}</p>

                        {item.versionName && (
                          <p className={styles.cartItemVersion}>
                            Version: {item.versionName}
                          </p>
                        )}

                        <p className={styles.cartItemMeta}>
                          Antal: {item.quantity} ·{" "}
                          {(item.price * item.quantity).toLocaleString(
                            "da-DK",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}{" "}
                          DKK
                        </p>
                      </div>

                      {/* FJERN ITEM KNAP */}
                      <button
                        type="button"
                        className={styles.removeItemButton}
                        onClick={() => removeItem(item.id)}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>

                <div className={styles.cartFooter}>
                  <div className={styles.cartTotal}>
                    <span>I alt</span>
                    <strong>
                      {totalPrice.toLocaleString("da-DK", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      DKK
                    </strong>
                  </div>

                  <button
                    type="button"
                    className={styles.cartBuyButton}
                    onClick={handleCheckout}
                  >
                    Køb
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
