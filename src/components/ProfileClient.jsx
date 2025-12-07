"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { auth } from "@/../firebaseClient";
import { db } from "@/../firebaseClient";
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { ref, onValue, set, remove, get } from "firebase/database";
import ProductCard from "@/components/ProductCard";
import { applyPreorderBadge } from "@/utils/preorderBadge";
import { FaHeart, FaStar } from "react-icons/fa6";
import styles from "./ProfilePage.module.css";
import Link from "next/link";

function slugifyArtist(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState("orders"); // "orders" | "wishlist" | "artists" | "profile"

  // Profil-form
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [orders, setOrders] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [favoriteArtists, setFavoriteArtists] = useState([]);

  // --- Auth guard ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/konto");
      } else {
        setUser(u);
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, [router]);

  // --- Hent profilinfo fra db, når vi har en bruger ---
  useEffect(() => {
    if (!user) return;
    const profileRef = ref(db, `users/${user.uid}/profile`);
    const unsub = onValue(profileRef, (snap) => {
      const val = snap.val();
      if (val) {
        setFullName(val.fullName || "");
        setAddress(val.address || "");
        setPostalCode(val.postalCode || "");
        setCity(val.city || "");
      }
    });
    return () => unsub();
  }, [user]);

  // --- Hent ordrer + berig med artist-navn ---
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadOrders() {
      try {
        const [ordersSnap, productsSnap, groupsSnap] = await Promise.all([
          get(ref(db, `orders/${user.uid}`)),
          get(ref(db, "products")),
          get(ref(db, "groups")),
        ]);

        if (!ordersSnap.exists()) {
          if (!cancelled) setOrders([]);
          return;
        }

        const ordersRaw = ordersSnap.val() || {};
        const productsRaw = productsSnap.exists() ? productsSnap.val() : {};
        const groupsRaw = groupsSnap.exists() ? groupsSnap.val() : {};

        const parsed = Object.entries(ordersRaw).map(([id, order]) => {
          const items = Array.isArray(order.items) ? order.items : [];

          const itemsWithArtist = items.map((item) => {
            const product = item.productId ? productsRaw[item.productId] : null;

            const group =
              product?.artistGroupId && groupsRaw[product.artistGroupId]
                ? groupsRaw[product.artistGroupId]
                : null;

            const artistName = group?.name || "";

            return {
              ...item,
              artist: artistName,
            };
          });

          return {
            id,
            ...order,
            createdAt: order.createdAt || 0,
            items: itemsWithArtist,
          };
        });

        // Sorter: nyeste først
        parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (!cancelled) {
          setOrders(parsed);
        }
      } catch (err) {
        console.error("Fejl ved hentning af ordrer:", err);
        if (!cancelled) {
          setOrders([]);
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // --- Hent ønskeliste ---
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadWishlist() {
      try {
        const [wishlistSnap, productsSnap, groupsSnap] = await Promise.all([
          get(ref(db, `users/${user.uid}/wishlist`)),
          get(ref(db, "products")),
          get(ref(db, "groups")),
        ]);

        if (!wishlistSnap.exists()) {
          if (!cancelled) setWishlistProducts([]);
          return;
        }

        const wishlistRaw = wishlistSnap.val() || {};
        const productIds = Object.keys(wishlistRaw);

        const productsRaw = productsSnap.exists() ? productsSnap.val() : {};
        const groupsRaw = groupsSnap.exists() ? groupsSnap.val() : {};
        const todayStr = new Date().toISOString().slice(0, 10);

        const list = productIds
          .map((productId) => {
            const p = productsRaw[productId];
            if (!p) return null;

              const group = p.artistGroupId
                ? groupsRaw[p.artistGroupId] || {}
                : {};
              const badges = applyPreorderBadge(
                p.badges || {},
                p.releaseDate,
                todayStr
              );

              return {
                id: productId,
                image: p.images?.cover || null,
                badges,
                title: p.title,
                artist: group.name || p.search?.artistLower || "",
                versions: Array.isArray(p.versions) ? p.versions : [],
                isRandomVersion: !!p.isRandomVersion,
                price: p.price,
              salePrice: p.salePrice ?? null,
              onSale: !!p.onSale,
              currency: p.currency || "DKK",
            };
          })
          .filter(Boolean);

        if (!cancelled) {
          setWishlistProducts(list);
        }
      } catch (err) {
        console.error("Fejl ved hentning af ønskeliste:", err);
        if (!cancelled) setWishlistProducts([]);
      }
    }

    loadWishlist();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // --- Hent favorit artister ---
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadFavoriteArtists() {
      try {
        const [favSnap, groupsSnap] = await Promise.all([
          get(ref(db, `users/${user.uid}/favoriteArtists`)),
          get(ref(db, "groups")),
        ]);

        if (!favSnap.exists()) {
          if (!cancelled) setFavoriteArtists([]);
          return;
        }

        const favRaw = favSnap.val() || {};
        const groupsRaw = groupsSnap.exists() ? groupsSnap.val() : {};

        const list = Object.keys(favRaw)
          .map((groupId) => {
            const g = groupsRaw[groupId];
            if (!g) return null;

            const name = g.name || "";
            const image =
              g.image ||
              g.imageUrl ||
              g.images?.cover ||
              "/placeholder-artist.png";

            return {
              id: groupId,
              name,
              image,
              slug: slugifyArtist(name),
            };
          })
          .filter(Boolean);

        if (!cancelled) {
          setFavoriteArtists(list);
        }
      } catch (err) {
        console.error("Fejl ved hentning af favorit artister:", err);
        if (!cancelled) setFavoriteArtists([]);
      }
    }

    loadFavoriteArtists();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileMessage("");

    try {
      const profileRef = ref(db, `users/${user.uid}/profile`);
      await set(profileRef, {
        email: user.email || "",
        fullName: fullName.trim(),
        address: address.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
      });
      setProfileMessage("Dine oplysninger er gemt ✅");
    } catch (err) {
      console.error(err);
      setProfileMessage("Der skete en fejl ved gemning.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/konto");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmDelete = window.confirm(
      "Er du sikker på, at du vil slette din konto? Dette kan ikke fortrydes."
    );
    if (!confirmDelete) return;

    try {
      // slet evt. brugerdata i db
      await remove(ref(db, `users/${user.uid}`));
    } catch (err) {
      console.error("Kunne ikke slette brugerdata:", err);
    }

    try {
      await deleteUser(user);
      router.push("/konto");
    } catch (err) {
      console.error("Kunne ikke slette selve brugeren:", err);
      alert("Kunne ikke slette kontoen (du skal måske logge ind igen først).");
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    if (!user) return;

    try {
      await remove(ref(db, `users/${user.uid}/wishlist/${productId}`));
      setWishlistProducts((prev) =>
        prev.filter((product) => product.id !== productId)
      );
    } catch (err) {
      console.error("Kunne ikke fjerne fra ønskeliste:", err);
    }
  };

  if (loadingAuth) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Henter din profil...</div>
      </main>
    );
  }

  if (!user) {
    return null; // vi er allerede ved at redirecte til /konto
  }

  const handleRemoveFavoriteArtist = async (groupId) => {
    if (!user) return;

    try {
      await remove(ref(db, `users/${user.uid}/favoriteArtists/${groupId}`));
      setFavoriteArtists((prev) => prev.filter((a) => a.id !== groupId));
    } catch (err) {
      console.error("Kunne ikke fjerne favorit artist:", err);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        {/* VENSTRE SIDE – navigation */}
        <aside className={styles.sidebar}>
          <h1 className={styles.greeting}>Din profil</h1>

          <nav className={styles.menu}>
            <button
              type="button"
              className={`${styles.menuItem} ${
                activeTab === "orders" ? styles.menuItemActive : ""
              }`}
              onClick={() => setActiveTab("orders")}
            >
              Mine ordre
            </button>

            <button
              type="button"
              className={`${styles.menuItem} ${
                activeTab === "wishlist" ? styles.menuItemActive : ""
              }`}
              onClick={() => setActiveTab("wishlist")}
            >
              Ønskeliste
            </button>

            <button
              type="button"
              className={`${styles.menuItem} ${
                activeTab === "artists" ? styles.menuItemActive : ""
              }`}
              onClick={() => setActiveTab("artists")}
            >
              Favorit artister
            </button>

            <button
              type="button"
              className={`${styles.menuItem} ${
                activeTab === "profile" ? styles.menuItemActive : ""
              }`}
              onClick={() => setActiveTab("profile")}
            >
              Personlig
              <br />
              information
            </button>
          </nav>

          <div className={styles.bottomActions}>
            <button
              type="button"
              className={styles.menuItem}
              onClick={handleLogout}
            >
              Log ud
            </button>

            <button
              type="button"
              className={styles.menuItemDanger}
              onClick={handleDeleteAccount}
            >
              Slet konto
            </button>
          </div>
        </aside>

        {/* HØJRE SIDE – indhold */}
        <section className={styles.content}>
          {activeTab === "orders" && <OrdersSection orders={orders} />}

          {activeTab === "wishlist" && (
            <WishlistSection
              items={wishlistProducts}
              onRemove={handleRemoveFromWishlist}
              userId={user.uid}
            />
          )}

          {activeTab === "artists" && (
            <FavoriteArtistsSection
              artists={favoriteArtists}
              onRemove={handleRemoveFavoriteArtist}
            />
          )}

          {activeTab === "profile" && (
            <ProfileFormSection
              email={user.email || ""}
              fullName={fullName}
              address={address}
              postalCode={postalCode}
              city={city}
              onFullNameChange={setFullName}
              onAddressChange={setAddress}
              onPostalCodeChange={setPostalCode}
              onCityChange={setCity}
              onSubmit={handleSaveProfile}
              saving={savingProfile}
              message={profileMessage}
            />
          )}
        </section>
      </div>
    </main>
  );
}

/* --------- UNDERKOMPONENTER --------- */

function OrdersSection({ orders }) {
  return (
    <div className={styles.ordersWrapper}>
      {orders.map((order) => {
        const shippingPrice = 40;
        const totalWithShipping = (order.total + shippingPrice)
          .toFixed(2)
          .replace(".", ",");

        const orderNumber = String(order.createdAt || order.id);

        return (
          <article key={order.id} className={styles.orderCard}>
            <header className={styles.orderHeader}>
              <div>
                Ordrenummer: <strong>{orderNumber}</strong>
              </div>
              <div>{order.date}</div>
              <div>
                Total: <strong>{totalWithShipping} DKK</strong>
              </div>
            </header>

            <div className={styles.orderDivider} />

            <div className={styles.orderBody}>
              <div className={styles.orderItems}>
                {order.items.map((item) => {
                  const quantity = item.quantity ?? 1; // fallback til 1 hvis den mangler

                  return (
                    <div
                      key={item.productId || item.id}
                      className={styles.orderItemRow}
                    >
                      <div className={styles.orderItemImageWrapper}>
                        <Image
                          src={item.image}
                          alt={item.title}
                          width={100}
                          height={100}
                          className={styles.orderItemImage}
                        />
                      </div>

                      <div className={styles.orderItemInfo}>
                        <p className={styles.orderItemTitle}>{item.title}</p>
                        {item.artist && (
                          <p className={styles.orderItemArtist}>
                            {item.artist}
                          </p>
                        )}

                        {item.versionName && (
                          <p className={styles.orderItemVersion}>
                            {item.versionName}
                          </p>
                        )}

                        <p className={styles.orderItemQuantity}>
                          Antal: {quantity}
                        </p>

                        <p className={styles.orderItemMeta}>
                          {item.price.toLocaleString("da-DK", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          DKK
                        </p>
                      </div>
                    </div>
                  );
                })}

                <p className={styles.orderShippingText}>
                  Levering {order.shipping} —{" "}
                  <strong>{shippingPrice} DKK</strong>
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function WishlistSection({ items, onRemove, userId }) {
  if (!items || items.length === 0) {
    return (
      <div className={styles.wishlistPlaceholder}>
        <p>
          Din ønskeliste er tom ✨<br />
          Tryk på hjertet på et produkt for at gemme det her.
        </p>
      </div>
    );
  }

  const handleShare = async () => {
    if (typeof window === "undefined" || !userId) return;

    const shareUrl = `${window.location.origin}/onskeliste/${userId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link til din ønskeliste er kopieret ✅");
    } catch (err) {
      console.error("Kunne ikke kopiere link:", err);
      window.prompt("Kopiér dette link til din ønskeliste:", shareUrl);
    }
  };

  return (
    <div>
      <div className={styles.wishlistTopRow}>
        <h2 className={styles.wishlistTitle}>Din ønskeliste</h2>
        <button
          type="button"
          className={styles.shareWishlistButton}
          onClick={handleShare}
        >
          Del ønskeliste
        </button>
      </div>

      <div className={styles.wishlistGrid}>
        {items.map((p) => (
          <div key={p.id} className={styles.wishlistCardWrapper}>
            <ProductCard
              id={p.id}
              image={p.image}
              badges={p.badges}
              title={p.title}
              artist={p.artist}
              versions={p.versions}
              isRandomVersion={p.isRandomVersion}
              price={p.price}
              salePrice={p.salePrice}
              onSale={p.onSale}
              currency={p.currency}
            />

            <button
              type="button"
              className={styles.wishlistHeartButton}
              onClick={() => onRemove(p.id)}
              aria-label="Fjern fra ønskeliste"
            >
              <FaHeart className={styles.wishlistHeartIcon} />
              <span className={styles.wishlistHeartMinus}>−</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FavoriteArtistsSection({ artists, onRemove }) {
  if (!artists || artists.length === 0) {
    return (
      <div className={styles.wishlistPlaceholder}>
        <p>
          Du har endnu ikke markeret nogle favorit artister ✨
          <br />
          Tryk på stjernen på en artist for at gemme den her.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.artistsGrid}>
      {artists.map((artist) => (
        <div key={artist.id} className={styles.artistCard}>
          <Link
            href={`/artister/${artist.slug}`}
            className={styles.artistImageWrapper}
          >
            <Image
              src={artist.image}
              alt={artist.name}
              width={250}
              height={250}
              className={styles.artistImage}
            />
          </Link>

          <div className={styles.artistRow}>
            <span className={styles.artistName}>{artist.name}</span>
            <button
              type="button"
              className={styles.artistFavButton}
              onClick={() => onRemove(artist.id)}
              aria-label="Fjern favorit artist"
            >
              <FaStar className={styles.artistStarIcon} />
              <span className={styles.artistStarMinus}>−</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileFormSection({
  email,
  fullName,
  address,
  postalCode,
  city,
  onFullNameChange,
  onAddressChange,
  onPostalCodeChange,
  onCityChange,
  onSubmit,
  saving,
  message,
}) {
  return (
    <form className={styles.profileForm} onSubmit={onSubmit}>
      <div className={styles.profileGrid}>
        <label className={styles.label}>
          <span>Email</span>
          <input type="email" className={styles.input} value={email} disabled />
        </label>

        <label className={styles.label}>
          <span>Adgangskode</span>
          <input
            type="password"
            className={styles.input}
            placeholder="••••••••"
            disabled
          />
        </label>

        <label className={styles.label}>
          <span>Fulde navn</span>
          <input
            type="text"
            className={styles.input}
            placeholder="Skriv fulde navn"
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
          />
        </label>

        <label className={styles.label}>
          <span>Adresse</span>
          <input
            type="text"
            className={styles.input}
            placeholder="Skriv adresse"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
          />
        </label>

        <label className={styles.label}>
          <span>Postnummer</span>
          <input
            type="text"
            className={styles.input}
            placeholder="Skriv postnummer"
            value={postalCode}
            onChange={(e) => onPostalCodeChange(e.target.value)}
          />
        </label>

        <label className={styles.label}>
          <span>By</span>
          <input
            type="text"
            className={styles.input}
            placeholder="Skriv by"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
          />
        </label>
      </div>

      {message && <p className={styles.profileMessage}>{message}</p>}

      <button type="submit" className={styles.saveButton} disabled={saving}>
        {saving ? "Gemmer..." : "Gem"}
      </button>
    </form>
  );
}
