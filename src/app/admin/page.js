"use client";

import { useEffect, useState } from "react";
import { db } from "../../firebaseClient";
import { ref, push, set, onValue, update } from "firebase/database";
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

  // ---------- PRODUKTER ----------
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  // Hovedkategori / merch-type
  const [mainType, setMainType] = useState("album"); // album | merch
  const [merchSubType, setMerchSubType] = useState("lightstick"); // kun hvis merch

  // Album- og clothes-specifik version/size info
  const [mediaType, setMediaType] = useState("CD"); // kun for albums
  const [versionName, setVersionName] = useState("Random ver.");
  const [versionCode, setVersionCode] = useState("RANDOM");
  const [versionTotal, setVersionTotal] = useState(""); // antal versioner for hele albummet (kun album)
  const [albumGalleryText, setAlbumGalleryText] = useState(""); // URLs pr. linje (kun album)

  // Fælles
  const [productTitle, setProductTitle] = useState("");
  const [baseProductId, setBaseProductId] = useState("");
  const [price, setPrice] = useState("219.95");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  // Badges (format/udgave)
  const [badgePob, setBadgePob] = useState(true);
  const [badgePreorder, setBadgePreorder] = useState(false);
  const [badgeDigipack, setBadgeDigipack] = useState(false);
  const [badgeDigitalEdition, setBadgeDigitalEdition] = useState(false);

  // UI
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [message, setMessage] = useState("");

  // ---------- HENT GRUPPER ----------
  useEffect(() => {
    const groupsRef = ref(db, "groups");

    const unsubscribe = onValue(groupsRef, (snapshot) => {
      const val = snapshot.val() || {};
      const arr = Object.entries(val).map(([id, data]) => ({
        id,
        ...data,
      }));

      setGroups(arr);

      if (!selectedGroupId && arr.length > 0) {
        setSelectedGroupId(arr[0].id);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedGroupId]);

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

      // Medlemmer (1 pr. linje)
      const members = membersText
        .split("\n")
        .map((m) => m.trim())
        .filter(Boolean);

      if (members.length > 0) {
        const updates = {};
        members.forEach((memberName) => {
          const memberKey = push(ref(db, "members")).key;
          updates[`members/${memberKey}`] = {
            name: memberName,
            groupId,
          };
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

      const isAlbum = mainType === "album";
      const merchType = isAlbum ? null : merchSubType;
      const isClothes = !isAlbum && merchType === "clothes";

      // baseProductId (fælles for alle versioner/størrelser)
      const autoBase =
        baseProductId.trim() ||
        `bp_${slugify(group.name)}_${slugify(productTitle)}`;

      const productsRef = ref(db, "products");
      const newProductRef = push(productsRef);
      const productId = newProductRef.key;

      // Medietype kun for albums
      const media = isAlbum ? mediaType : null;

      // Kategori-badges (afledt af mainType + merchSubType)
      const categoryBadges = {
        ALBUM: isAlbum,
        MERCHANDISE: !isAlbum,
        LIGHTSTICK: !isAlbum && merchType === "lightstick",
        CLOTHES: !isAlbum && merchType === "clothes",
      };

      // Format/udgave-badges (manuel)
      const formatBadges = {
        DIGIPACK: badgeDigipack,
        DIGITAL_EDITION: badgeDigitalEdition,
        POB: badgePob,
        "PRE-ORDER": badgePreorder,
      };

      const badges = {
        ...categoryBadges,
        ...formatBadges,
      };

      const priceNumber = parseFloat(price) || 0;

      const productData = {
        title: productTitle,
        artistGroupId: selectedGroupId,

        mainType, // album | merch
        merchSubType: merchType, // lightstick | clothes | other | null
        type: isAlbum ? "album" : "merch", // ekstra felt til simple queries

        mediaType: media, // CD/Vinyl/Digital eller null
        groupType: group.groupType, // boy/girl/mixed

        // Albums og clothes har "version" (albums = version, clothes = størrelse)
        versionName: isAlbum || isClothes ? versionName : null,
        versionCode: isAlbum || isClothes ? versionCode : null,

        baseProductId: autoBase,

        price: priceNumber,
        currency: "DKK",

        badges,
        isPreorder: badgePreorder,
        hasPOB: badgePob,

        images: {
          cover: coverImageUrl || null, // ét billede pr. version/størrelse
        },

        createdAt: Date.now(),

        search: {
          titleLower: productTitle.toLowerCase(),
          artistLower: group.name.toLowerCase(),
        },
      };

      await set(newProductRef, productData);

      // Relations/alsoAs (samler versioner/størrelser under baseProductId)
      await set(ref(db, `relations/alsoAs/${autoBase}/${productId}`), true);

      // Base-meta: fælles info for hele "albummet" eller produktfamilien
      const rootUpdates = {};
      rootUpdates[`baseMeta/${autoBase}/title`] = productTitle;
      rootUpdates[`baseMeta/${autoBase}/artistGroupId`] = selectedGroupId;
      rootUpdates[`baseMeta/${autoBase}/mainType`] = mainType;

      // versionTotal + albumImages kun relevant for albums
      if (isAlbum && versionTotal.trim() !== "") {
        const totalNum = parseInt(versionTotal, 10);
        if (!Number.isNaN(totalNum)) {
          rootUpdates[`baseMeta/${autoBase}/versionTotal`] = totalNum;
        }
      }

      if (isAlbum && albumGalleryText.trim() !== "") {
        const urls = albumGalleryText
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean);

        if (urls.length > 0) {
          const imagesObj = {};
          urls.forEach((url, index) => {
            imagesObj[index] = { url };
          });

          rootUpdates[`baseMeta/${autoBase}/albumImages`] = imagesObj;
        }
      }

      if (Object.keys(rootUpdates).length > 0) {
        await update(ref(db), rootUpdates);
      }

      // Reset felter
      setProductTitle("");
      setBaseProductId("");
      setPrice("219.95");
      setCoverImageUrl("");

      setMainType("album");
      setMerchSubType("lightstick");
      setMediaType("CD");
      setVersionName("Random ver.");
      setVersionCode("RANDOM");
      setVersionTotal("");
      setAlbumGalleryText("");

      setBadgePob(true);
      setBadgePreorder(false);
      setBadgeDigipack(false);
      setBadgeDigitalEdition(false);

      setMessage("Produkt oprettet ✓");
    } catch (err) {
      console.error(err);
      setMessage("FEJL: Kunne ikke oprette produktet.");
    } finally {
      setIsSubmittingProduct(false);
    }
  }

  // ---------- RENDER ----------
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
          {/* Gruppe valg */}
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

          {/* Titel */}
          <label>
            Titel
            <input
              type="text"
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              required
            />
          </label>

          {/* Hovedkategori + merch-subtype */}
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

          {/* Medietype (kun albums) */}
          {mainType === "album" && (
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

          {/* Version / størrelse */}
          {(mainType === "album" ||
            (mainType === "merch" && merchSubType === "clothes")) && (
            <>
              <div className={styles.row}>
                <label>
                  {mainType === "album"
                    ? "Version navn"
                    : "Størrelse (fx M, L, XL)"}
                  <input
                    type="text"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                  />
                </label>

                <label>
                  {mainType === "album"
                    ? "Version kode"
                    : "Størrelseskode (fx M, L)"}
                  <input
                    type="text"
                    value={versionCode}
                    onChange={(e) => setVersionCode(e.target.value)}
                  />
                </label>
              </div>

              {mainType === "album" && (
                <>
                  <label>
                    Antal versioner i alt (for albummet)
                    <input
                      type="number"
                      min="1"
                      value={versionTotal}
                      onChange={(e) => setVersionTotal(e.target.value)}
                      placeholder="fx 2"
                    />
                  </label>

                  <label>
                    Album gallery billeder (URLs, 1 pr. linje)
                    <textarea
                      value={albumGalleryText}
                      onChange={(e) => setAlbumGalleryText(e.target.value)}
                      placeholder={
                        "https://.../inside1.jpg\nhttps://.../inside2.jpg"
                      }
                    />
                  </label>
                </>
              )}
            </>
          )}

          {/* baseProductId */}
          <label>
            BaseProductId (valgfrit)
            <input
              type="text"
              value={baseProductId}
              onChange={(e) => setBaseProductId(e.target.value)}
              placeholder="bp_zerobaseone_never-say-never"
            />
          </label>

          {/* Pris + cover */}
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
              Cover URL (version/størrelse)
              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>

          {/* Badges */}
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
                checked={badgePob}
                onChange={(e) => setBadgePob(e.target.checked)}
              />
              POB
            </label>

            <label>
              <input
                type="checkbox"
                checked={badgePreorder}
                onChange={(e) => setBadgePreorder(e.target.checked)}
              />
              PRE-ORDER
            </label>
          </fieldset>

          <button className={styles.btnPrimary} disabled={isSubmittingProduct}>
            {isSubmittingProduct ? "Opretter..." : "Opret produkt"}
          </button>
        </form>
      </div>

      {message && <p className={styles.message}>{message}</p>}
    </section>
  );
}
