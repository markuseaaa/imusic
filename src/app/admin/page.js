"use client";

import { useEffect, useState } from "react";
import { db } from "@/../firebaseClient";
import { ref, push, set, onValue, update, remove } from "firebase/database";
import styles from "./admin.module.css";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminPage() {
  // ---------- GRUPPER ----------
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState("boy");
  const [groupImageUrl, setGroupImageUrl] = useState("");
  const [membersText, setMembersText] = useState("");
  const [groups, setGroups] = useState([]);

  // ---------- PRODUKTER (OPRET) ----------
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [mainType, setMainType] = useState("album");
  const [merchSubType, setMerchSubType] = useState("lightstick");
  const [mediaType, setMediaType] = useState("CD");

  const [versionTotal, setVersionTotal] = useState("");
  const [versionNamesAll, setVersionNamesAll] = useState([""]);
  const [versionCodesAll, setVersionCodesAll] = useState([""]);
  const [versionDetailsAll, setVersionDetailsAll] = useState([""]);
  const [versionImagesAll, setVersionImagesAll] = useState([""]);

  const [lsVersionName, setLsVersionName] = useState("");
  const [lsVersionDetails, setLsVersionDetails] = useState("");
  const [lsVersionImage, setLsVersionImage] = useState("");

  const [productTitle, setProductTitle] = useState("");
  const [baseProductId, setBaseProductId] = useState("");
  const [price, setPrice] = useState("219.95");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [extraImagesText, setExtraImagesText] = useState("");
  const [merchDetails, setMerchDetails] = useState("");

  const [badgePreorder, setBadgePreorder] = useState(false);
  const [badgeDigipack, setBadgeDigipack] = useState(false);
  const [badgeDigitalEdition, setBadgeDigitalEdition] = useState(false);
  const [pobLabel, setPobLabel] = useState("");
  const [isRandomVersion, setIsRandomVersion] = useState(false);

  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [message, setMessage] = useState("");

  // ---------- PRODUKTER (LISTE + EDIT) ----------
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAlbum = mainType === "album";
  const merchType = isAlbum ? null : merchSubType;
  const isClothes = !isAlbum && merchType === "clothes";
  const isOtherMerch = !isAlbum && merchType === "other";

  // ---------- HENT GRUPPER ----------
  useEffect(() => {
    const groupsRef = ref(db, "groups");
    const unsub = onValue(groupsRef, (snapshot) => {
      const val = snapshot.val() || {};
      const arr = Object.entries(val).map(([id, data]) => ({ id, ...data }));
      setGroups(arr);
      if (!selectedGroupId && arr.length > 0) {
        setSelectedGroupId(arr[0].id);
      }
    });
    return () => unsub();
  }, [selectedGroupId]);

  // ---------- HENT PRODUKTER ----------
  useEffect(() => {
    const productsRef = ref(db, "products");
    const unsub = onValue(productsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setProducts([]);
        return;
      }
      const val = snapshot.val();
      const arr = Object.entries(val).map(([id, p]) => ({ id, ...p }));
      arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setProducts(arr);
    });
    return () => unsub();
  }, []);

  // ---------- OPRET GRUPPE ----------
  async function handleCreateGroup(e) {
    e.preventDefault();
    setIsSubmittingGroup(true);
    setMessage("");

    try {
      const slug = slugify(groupName);
      const groupsRef = ref(db, "groups");
      const newGroupRef = push(groupsRef);
      const groupId = newGroupRef.key;

      await set(newGroupRef, {
        name: groupName,
        slug,
        groupType,
        image: groupImageUrl || null,
      });

      const members = membersText
        .split("\n")
        .map((m) => m.trim())
        .filter(Boolean);

      if (members.length > 0) {
        const updates = {};
        members.forEach((memberName) => {
          const memberKey = push(ref(db, "members")).key;
          updates[`members/${memberKey}`] = { name: memberName, groupId };
        });
        await update(ref(db), updates);
      }

      setGroupName("");
      setGroupImageUrl("");
      setMembersText("");
      setMessage("Gruppe oprettet ✓");
    } catch (err) {
      console.error(err);
      setMessage("FEJL: Kunne ikke oprette gruppen.");
    } finally {
      setIsSubmittingGroup(false);
    }
  }

  // ---------- OPRET PRODUKT ----------
  async function handleCreateProduct(e) {
    e.preventDefault();
    setIsSubmittingProduct(true);
    setMessage("");

    try {
      if (!selectedGroupId) {
        setMessage("Du skal vælge en gruppe.");
        setIsSubmittingProduct(false);
        return;
      }

      const group = groups.find((g) => g.id === selectedGroupId);
      if (!group) {
        setMessage("FEJL: Ugyldig gruppe.");
        setIsSubmittingProduct(false);
        return;
      }

      const isAlbumLocal = mainType === "album";
      const merchTypeLocal = isAlbumLocal ? null : merchSubType;
      const isClothesLocal = !isAlbumLocal && merchTypeLocal === "clothes";
      const isLightstickLocal =
        !isAlbumLocal && merchTypeLocal === "lightstick";
      const isOtherMerchLocal = !isAlbumLocal && merchTypeLocal === "other";

      const autoBase =
        baseProductId.trim() ||
        `bp_${slugify(group.name)}_${slugify(productTitle)}`;

      const productsRef = ref(db, "products");
      const newProductRef = push(productsRef);
      const productId = newProductRef.key;

      const media = isAlbumLocal ? mediaType : null;

      const categoryBadges = {
        ALBUM: isAlbumLocal,
        MERCHANDISE: !isAlbumLocal,
        LIGHTSTICK: !isAlbumLocal && merchTypeLocal === "lightstick",
        CLOTHES: !isAlbumLocal && merchTypeLocal === "clothes",
      };

      const formatBadges = {
        DIGIPACK: badgeDigipack,
        DIGITAL_EDITION: badgeDigitalEdition,
        POB: !!pobLabel.trim(),
        "PRE-ORDER": badgePreorder,
        RANDOM_VER: isRandomVersion,
      };

      const badges = { ...categoryBadges, ...formatBadges };

      const priceNumber = parseFloat(price) || 0;

      let versionsArray = null;

      // Album + clothes + andet merch bruger det almindelige versions-system
      if (
        (isAlbumLocal || isClothesLocal || isOtherMerchLocal) &&
        versionTotal.trim() !== ""
      ) {
        const totalNum = parseInt(versionTotal, 10);
        if (!Number.isNaN(totalNum) && totalNum > 0) {
          versionsArray = Array.from({ length: totalNum }, (_, i) => ({
            name:
              (versionNamesAll[i] || "").trim() ||
              (isAlbumLocal
                ? `Version ${i + 1}`
                : isClothesLocal
                ? `Størrelse ${i + 1}`
                : `Version ${i + 1}`),
            code: (versionCodesAll[i] || "").trim() || null,
            details: (versionDetailsAll[i] || "").trim() || "",
            image: (versionImagesAll[i] || "").trim() || null,
          }));
        }
      }
      // Lightstick har én enkelt "version" med navn/billede/detaljer
      else if (isLightstickLocal) {
        versionsArray = [
          {
            name: lsVersionName.trim() || "Official Lightstick",
            code: null,
            details: lsVersionDetails.trim() || "",
            image: lsVersionImage.trim() || null,
          },
        ];
      }

      const extraImages =
        !isAlbumLocal && merchTypeLocal === "other"
          ? extraImagesText
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
          : [];

      const productData = {
        title: productTitle,
        artistGroupId: selectedGroupId,

        mainType,
        merchSubType: merchTypeLocal,
        type: isAlbumLocal ? "album" : "merch",

        mediaType: media,
        groupType: group.groupType,

        versions: versionsArray,
        isRandomVersion,
        sellingMode: isRandomVersion ? "RANDOM" : "CHOOSE_VERSION",

        baseProductId: autoBase,

        price: priceNumber,
        salePrice: null,
        onSale: false,
        currency: "DKK",

        badges,
        isPreorder: badgePreorder,
        hasPOB: !!pobLabel.trim(),
        pobLabel: pobLabel.trim() || null,

        images: {
          cover: coverImageUrl || null,
          gallery: extraImages.length > 0 ? extraImages : null,
        },

        details: !isAlbumLocal ? merchDetails.trim() || null : null,

        releaseDate: releaseDate || null,
        createdAt: Date.now(),

        search: {
          titleLower: productTitle.toLowerCase(),
          artistLower: group.name.toLowerCase(),
        },
      };

      await set(newProductRef, productData);
      await set(ref(db, `relations/alsoAs/${autoBase}/${productId}`), true);

      const rootUpdates = {};
      rootUpdates[`baseMeta/${autoBase}/title`] = productTitle;
      rootUpdates[`baseMeta/${autoBase}/artistGroupId`] = selectedGroupId;
      rootUpdates[`baseMeta/${autoBase}/mainType`] = mainType;
      if (Object.keys(rootUpdates).length > 0) {
        await update(ref(db), rootUpdates);
      }

      // reset
      setProductTitle("");
      setBaseProductId("");
      setPrice("219.95");
      setCoverImageUrl("");
      setReleaseDate("");

      setMainType("album");
      setMerchSubType("lightstick");
      setMediaType("CD");

      setVersionTotal("");
      setVersionNamesAll([""]);
      setVersionCodesAll([""]);
      setVersionDetailsAll([""]);
      setVersionImagesAll([""]);
      setExtraImagesText("");
      setMerchDetails("");

      setLsVersionName("");
      setLsVersionDetails("");
      setLsVersionImage("");

      setPobLabel("");
      setBadgePreorder(false);
      setBadgeDigipack(false);
      setBadgeDigitalEdition(false);
      setIsRandomVersion(false);

      setMessage("Produkt oprettet ✓");
    } catch (err) {
      console.error(err);
      setMessage("FEJL: Kunne ikke oprette produktet.");
    } finally {
      setIsSubmittingProduct(false);
    }
  }

  // ---------- EDIT / DELETE ----------
  function openEditModal(product) {
    setEditingProduct({
      ...product,
      price: product.price?.toString() ?? "",
      salePrice:
        product.salePrice !== undefined && product.salePrice !== null
          ? product.salePrice.toString()
          : "",
      releaseDate: product.releaseDate || "",
      pobLabel: product.pobLabel || "",
      images: product.images || { cover: "" },
      badges: product.badges || {},
      isRandomVersion: !!product.isRandomVersion,
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSavingEdit(true);

    try {
      const priceNumber = parseFloat(editingProduct.price) || 0;
      const salePriceNumber =
        editingProduct.salePrice && editingProduct.salePrice !== ""
          ? parseFloat(editingProduct.salePrice)
          : null;

      const onSale = salePriceNumber !== null && salePriceNumber < priceNumber;

      const productRef = ref(db, `products/${editingProduct.id}`);

      const updates = {
        title: editingProduct.title || "",
        price: priceNumber,
        salePrice: salePriceNumber,
        onSale,
        releaseDate: editingProduct.releaseDate || null,
        pobLabel:
          editingProduct.pobLabel?.trim() === ""
            ? null
            : editingProduct.pobLabel.trim(),
        isRandomVersion: !!editingProduct.isRandomVersion,
        sellingMode: editingProduct.isRandomVersion
          ? "RANDOM"
          : "CHOOSE_VERSION",
        images: {
          ...(editingProduct.images || {}),
          cover: editingProduct.images?.cover || null,
        },
      };

      await update(productRef, updates);
      setEditingProduct(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDeleteProduct() {
    if (!editingProduct) return;
    const confirmDelete = window.confirm(
      "Er du sikker på, at du vil slette dette produkt?"
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await remove(ref(db, `products/${editingProduct.id}`));
      if (editingProduct.baseProductId) {
        await update(ref(db), {
          [`relations/alsoAs/${editingProduct.baseProductId}/${editingProduct.id}`]:
            null,
        });
      }
      setEditingProduct(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  }

  // ---------- FILTER PRODUKTER ----------
  const groupsMap = Object.fromEntries(groups.map((g) => [g.id, g]));
  const search = searchTerm.toLowerCase().trim();

  const filteredProducts = products.filter((p) => {
    if (!search) return true;
    const title = p.title?.toLowerCase() || "";
    const artistName = groupsMap[p.artistGroupId]?.name?.toLowerCase() || "";
    const baseId = p.baseProductId?.toLowerCase() || "";
    return (
      title.includes(search) ||
      artistName.includes(search) ||
      baseId.includes(search)
    );
  });

  return (
    <section className={styles.adminGrid}>
      {/* GRUPPE-KORT */}
      <div className={styles.card}>
        <h2>Opret gruppe</h2>
        <form onSubmit={handleCreateGroup} className={styles.form}>
          <label>
            Gruppenavn
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
          </label>

          <label>
            Gruppetype
            <select
              value={groupType}
              onChange={(e) => setGroupType(e.target.value)}
            >
              <option value="boy">Boy group</option>
              <option value="girl">Girl group</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>

          <label>
            Gruppe-billede URL
            <input
              type="text"
              value={groupImageUrl}
              onChange={(e) => setGroupImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>

          <label>
            Medlemmer (1 pr. linje)
            <textarea
              value={membersText}
              onChange={(e) => setMembersText(e.target.value)}
              placeholder={"Sung Hanbin\nZhang Hao\nKim Jiwoong"}
            />
          </label>

          <button className={styles.btnPrimary} disabled={isSubmittingGroup}>
            {isSubmittingGroup ? "Opretter..." : "Opret gruppe"}
          </button>
        </form>
      </div>

      {/* PRODUKT-KORT */}
      <div className={styles.card}>
        <h2>Opret produkt</h2>

        <form onSubmit={handleCreateProduct} className={styles.form}>
          <label>
            Artist / gruppe
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              {groups.length === 0 && (
                <option value="">(Opret en gruppe først)</option>
              )}
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Titel
            <input
              type="text"
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              required
            />
          </label>

          <div className={styles.row}>
            <label>
              Hovedkategori
              <select
                value={mainType}
                onChange={(e) => setMainType(e.target.value)}
              >
                <option value="album">Album</option>
                <option value="merch">Merchandise</option>
              </select>
            </label>

            {mainType === "merch" && (
              <label>
                Merch-type
                <select
                  value={merchSubType}
                  onChange={(e) => setMerchSubType(e.target.value)}
                >
                  <option value="lightstick">Lightstick</option>
                  <option value="clothes">Clothes</option>
                  <option value="other">Andet merch</option>
                </select>
              </label>
            )}
          </div>

          {isAlbum && (
            <label>
              Medietype
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
              >
                <option value="CD">CD</option>
                <option value="Vinyl">Vinyl</option>
                <option value="Digital">Digital</option>
              </select>
            </label>
          )}

          {/* Lightstick: enkelt version med navn/billede/detaljer */}
          {mainType === "merch" && merchSubType === "lightstick" && (
            <div className={styles.versionsMeta}>
              <div className={styles.versionMetaRow}>
                <label>
                  Version navn
                  <input
                    type="text"
                    value={lsVersionName}
                    onChange={(e) => setLsVersionName(e.target.value)}
                    placeholder="Official Lightstick Ver. 2"
                  />
                </label>

                <label>
                  Version detaljer
                  <textarea
                    value={lsVersionDetails}
                    onChange={(e) => setLsVersionDetails(e.target.value)}
                    placeholder="Indhold, lysmodes, bluetooth osv."
                  />
                </label>

                <label>
                  Version billede URL
                  <input
                    type="text"
                    value={lsVersionImage}
                    onChange={(e) => setLsVersionImage(e.target.value)}
                    placeholder="https://.../lightstick.jpg"
                  />
                </label>
              </div>
            </div>
          )}

          {(isAlbum || isClothes || isOtherMerch) && (
            <>
              <label>
                {isAlbum
                  ? "Antal versioner i alt (for albummet)"
                  : isClothes
                  ? "Antal størrelser i alt (for produktet)"
                  : "Antal versioner i alt (for merch)"}
                <input
                  type="number"
                  min="1"
                  value={versionTotal}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVersionTotal(val);
                    const count = Math.max(1, parseInt(val || "1", 10)) || 1;

                    setVersionNamesAll((prev) => {
                      const next = [...prev];
                      next.length = count;
                      for (let i = 0; i < count; i++) {
                        if (!next[i]) {
                          if (isAlbum) next[i] = `Version ${i + 1}`;
                          else if (isClothes) next[i] = `Størrelse ${i + 1}`;
                          else next[i] = `Version ${i + 1}`;
                        }
                      }
                      return next;
                    });

                    setVersionCodesAll((prev) => {
                      const next = [...prev];
                      next.length = count;
                      return next;
                    });

                    setVersionDetailsAll((prev) => {
                      const next = [...prev];
                      next.length = count;
                      return next;
                    });

                    setVersionImagesAll((prev) => {
                      const next = [...prev];
                      next.length = count;
                      return next;
                    });
                  }}
                  placeholder={isAlbum ? "fx 2" : isClothes ? "fx 3" : "fx 2"}
                />
              </label>

              {parseInt(versionTotal || "0", 10) > 0 && (
                <div className={styles.versionsMeta}>
                  {Array.from(
                    {
                      length: parseInt(versionTotal || "0", 10),
                    },
                    (_, index) => (
                      <div key={index} className={styles.versionMetaRow}>
                        <label>
                          {isAlbum
                            ? `Version ${index + 1} navn`
                            : isClothes
                            ? `Størrelse ${index + 1} navn`
                            : `Version ${index + 1} navn`}
                          <input
                            type="text"
                            value={versionNamesAll[index] || ""}
                            onChange={(e) => {
                              const next = [...versionNamesAll];
                              next[index] = e.target.value;
                              setVersionNamesAll(next);
                            }}
                          />
                        </label>

                        <label>
                          {isAlbum
                            ? `Version ${index + 1} kode`
                            : isClothes
                            ? `Størrelse ${index + 1} kode`
                            : `Version ${index + 1} kode`}
                          <input
                            type="text"
                            value={versionCodesAll[index] || ""}
                            onChange={(e) => {
                              const next = [...versionCodesAll];
                              next[index] = e.target.value;
                              setVersionCodesAll(next);
                            }}
                            placeholder={
                              isAlbum
                                ? "fx A, B, RANDOM"
                                : isClothes
                                ? "fx M, L"
                                : "fx Makestar, Weverse"
                            }
                          />
                        </label>

                        <label>
                          {isAlbum
                            ? `Version ${index + 1} detaljer`
                            : isClothes
                            ? `Størrelse ${index + 1} detaljer`
                            : `Version ${index + 1} detaljer`}
                          <textarea
                            value={versionDetailsAll[index] || ""}
                            onChange={(e) => {
                              const next = [...versionDetailsAll];
                              next[index] = e.target.value;
                              setVersionDetailsAll(next);
                            }}
                            placeholder="Indhold, fotobook, ekstra POB osv."
                          />
                        </label>

                        <label>
                          {isAlbum
                            ? `Version ${index + 1} billede URL`
                            : isClothes
                            ? `Størrelse ${index + 1} billede URL`
                            : `Version ${index + 1} billede URL`}
                          <input
                            type="text"
                            value={versionImagesAll[index] || ""}
                            onChange={(e) => {
                              const next = [...versionImagesAll];
                              next[index] = e.target.value;
                              setVersionImagesAll(next);
                            }}
                            placeholder="https://.../cover.jpg"
                          />
                        </label>
                      </div>
                    )
                  )}
                </div>
              )}

              <label>
                <input
                  type="checkbox"
                  checked={isRandomVersion}
                  onChange={(e) => setIsRandomVersion(e.target.checked)}
                />{" "}
                Sælges som &#39;Random version&#39; (kunden vælger ikke selv)
              </label>
            </>
          )}

          <label>
            BaseProductId (valgfrit)
            <input
              type="text"
              value={baseProductId}
              onChange={(e) => setBaseProductId(e.target.value)}
              placeholder="bp_zerobaseone_never-say-never"
            />
          </label>

          <div className={styles.row}>
            <label>
              Pris (DKK)
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>

            <label>
              Cover URL (generelt)
              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>

          {mainType === "merch" && merchSubType === "other" && (
            <label>
              Ekstra billeder (1 URL pr. linje)
              <textarea
                value={extraImagesText}
                onChange={(e) => setExtraImagesText(e.target.value)}
                placeholder={
                  "https://.../billede1.jpg\nhttps://.../billede2.jpg"
                }
              />
            </label>
          )}

          {mainType === "merch" && (
            <label>
              Detaljer / indhold
              <textarea
                value={merchDetails}
                onChange={(e) => setMerchDetails(e.target.value)}
                placeholder="Beskriv indhold, materiale, størrelse-guide, hvad der følger med osv."
              />
            </label>
          )}

          <label>
            Udgivelsesdato
            <input
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
            />
          </label>

          <fieldset className={styles.badges}>
            <legend>Badges (format / udgave)</legend>

            <label>
              <input
                type="checkbox"
                checked={badgeDigipack}
                onChange={(e) => setBadgeDigipack(e.target.checked)}
              />
              DIGIPACK
            </label>

            <label>
              <input
                type="checkbox"
                checked={badgeDigitalEdition}
                onChange={(e) => setBadgeDigitalEdition(e.target.checked)}
              />
              DIGITAL EDITION
            </label>

            <label>
              <input
                type="checkbox"
                checked={badgePreorder}
                onChange={(e) => setBadgePreorder(e.target.checked)}
              />
              PRE-ORDER
            </label>

            <label>
              POB label
              <input
                type="text"
                value={pobLabel}
                onChange={(e) => setPobLabel(e.target.value)}
                placeholder="fx Makestar"
              />
            </label>
          </fieldset>

          <button className={styles.btnPrimary} disabled={isSubmittingProduct}>
            {isSubmittingProduct ? "Opretter..." : "Opret produkt"}
          </button>
        </form>
      </div>

      {/* PRODUKTLISTE + SØG */}
      <div className={`${styles.card} ${styles.cardWide}`}>
        <h2>Produkter</h2>

        <div className={styles.productsHeaderRow}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Søg efter titel, gruppe eller baseProductId..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className={styles.productCount}>
            {filteredProducts.length} produkter
          </span>
        </div>

        <div className={styles.productList}>
          {filteredProducts.map((p) => (
            <div key={p.id} className={styles.productListItem}>
              <div className={styles.productMeta}>
                <strong>{p.title}</strong>
                <span>
                  {groupsMap[p.artistGroupId]?.name || "Ukendt gruppe"}
                </span>
                <span>
                  {p.price?.toFixed
                    ? `${p.price.toFixed(2)} DKK`
                    : `${p.price} DKK`}
                  {p.onSale && p.salePrice && (
                    <> → {p.salePrice.toFixed(2)} DKK</>
                  )}
                </span>
                {p.releaseDate && <span>Release: {p.releaseDate}</span>}
                {p.baseProductId && (
                  <span className={styles.baseId}>{p.baseProductId}</span>
                )}
              </div>

              <div className={styles.productActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => openEditModal(p)}
                >
                  Rediger
                </button>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <p className={styles.emptyText}>Ingen produkter fundet.</p>
          )}
        </div>
      </div>

      {message && <p className={styles.message}>{message}</p>}

      {/* EDIT MODAL */}
      {editingProduct && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Rediger produkt</h3>

            <form onSubmit={handleSaveEdit} className={styles.modalForm}>
              <label>
                Titel
                <input
                  type="text"
                  value={editingProduct.title || ""}
                  onChange={(e) =>
                    setEditingProduct((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                />
              </label>

              <div className={styles.modalRow}>
                <label>
                  Pris (DKK)
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.price || ""}
                    onChange={(e) =>
                      setEditingProduct((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Tilbuds-pris (DKK)
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.salePrice || ""}
                    onChange={(e) =>
                      setEditingProduct((prev) => ({
                        ...prev,
                        salePrice: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label>
                Udgivelsesdato
                <input
                  type="date"
                  value={editingProduct.releaseDate || ""}
                  onChange={(e) =>
                    setEditingProduct((prev) => ({
                      ...prev,
                      releaseDate: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Cover URL
                <input
                  type="text"
                  value={editingProduct.images?.cover || ""}
                  onChange={(e) =>
                    setEditingProduct((prev) => ({
                      ...prev,
                      images: {
                        ...(prev.images || {}),
                        cover: e.target.value,
                      },
                    }))
                  }
                />
              </label>

              <label>
                POB label
                <input
                  type="text"
                  value={editingProduct.pobLabel || ""}
                  onChange={(e) =>
                    setEditingProduct((prev) => ({
                      ...prev,
                      pobLabel: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={!!editingProduct.isRandomVersion}
                  onChange={(e) =>
                    setEditingProduct((prev) => ({
                      ...prev,
                      isRandomVersion: e.target.checked,
                    }))
                  }
                />{" "}
                Sælges som &#39;Random version&#39;
              </label>

              {Array.isArray(editingProduct.versions) &&
                editingProduct.versions.length > 0 && (
                  <div className={styles.versionsReadOnly}>
                    <p>Versioner / størrelser (kun info):</p>
                    <ul>
                      {editingProduct.versions.map((v, i) => (
                        <li key={v.code || v.name || i}>
                          <strong>{v.name}</strong>
                          {v.code && <> ({v.code})</>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setEditingProduct(null)}
                >
                  Luk
                </button>

                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={handleDeleteProduct}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Sletter..." : "Slet produkt"}
                </button>

                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? "Gemmer..." : "Gem ændringer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
