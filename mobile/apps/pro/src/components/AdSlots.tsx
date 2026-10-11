// The only two ad surfaces in the UI (redesign spec §7). Each one collapses to
// nothing when ads aren't available (no fill, module missing, consent), so a
// failed ad never leaves a hole in a screen. The full-screen interstitial lives
// in lib/ads.ts and is wired only to the Pro Job Done → Jobs transition.
// Shared verbatim by apps/customer and apps/pro.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { colors } from "../lib/theme";
import { adUnit, getAds, initAds } from "../lib/ads";
import { Icon } from "./Icon";
import { haptic } from "./ds";
import { useT } from "../lib/i18n";

// ─── Native "Sponsored" strip — Home screens only, above the bottom nav ───
export function NativeAdStrip() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    initAds().then((ok) => !cancelled && setReady(ok));
    return () => {
      cancelled = true;
    };
  }, []);
  if (!ready || !adUnit("native")) return null;
  return <NativeAdStripLoaded />;
}

function NativeAdStripLoaded() {
  const t = useT();
  const ads = getAds();
  // The hook comes from the lazily-required module; this component only mounts
  // once getAds() is known to be non-null.
  const result = ads!.useNativeAd({ adUnitId: adUnit("native")! });
  if (result.status !== "loaded") return null;
  const ad = result.nativeAd;
  const { NativeAdView, NativeAsset, NativeAssetType } = ads!;

  return (
    <NativeAdView nativeAd={ad} style={styles.strip}>
      {ad.icon ? (
        <NativeAsset assetType={NativeAssetType.ICON}>
          <View style={styles.iconBox}>
            <NativeIcon uri={ad.icon.url} />
          </View>
        </NativeAsset>
      ) : (
        <View style={styles.iconBox}>
          <Text style={{ fontSize: 16 }}>🛠️</Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.sponsored}>{t("ads.sponsored")}</Text>
        <NativeAsset assetType={NativeAssetType.HEADLINE}>
          <Text style={styles.headline} numberOfLines={1}>
            {ad.headline}
          </Text>
        </NativeAsset>
      </View>
      <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
        <Text style={styles.cta} numberOfLines={1}>
          {ad.callToAction || t("ads.open")}
        </Text>
      </NativeAsset>
      <Icon name="chevron-right" size={14} color={colors.textFaint} />
    </NativeAdView>
  );
}

function NativeIcon({ uri }: { uri: string }) {
  
  return <Image source={{ uri }} style={{ width: 34, height: 34, borderRadius: 9 }} />;
}

// ─── Rewarded video — strictly opt-in, never auto-played (Pro Jobs screen) ───
export function RewardedBoostCard({ active, onReward }: { active: boolean; onReward: () => Promise<void> }) {
  const t = useT();
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const adRef = useRef<ReturnType<NonNullable<ReturnType<typeof getAds>>["RewardedAd"]["createForAdRequest"]> | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ads = getAds();
      const unitId = adUnit("rewarded");
      if (!ads || !unitId || !(await initAds()) || cancelled) return;
      try {
        const ad = ads.RewardedAd.createForAdRequest(unitId);
        adRef.current = ad;
        ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
          loadedRef.current = true;
          if (!cancelled) setAvailable(true);
        });
        ad.addAdEventListener(ads.AdEventType.ERROR, () => {
          loadedRef.current = false;
          if (!cancelled) setAvailable(false);
        });
        ad.load();
      } catch (e) {
        console.warn("[ads] rewarded load failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available && !active) return null;

  async function watch() {
    const ads = getAds();
    const ad = adRef.current;
    if (!ads || !ad || !loadedRef.current || busy) return;
    haptic.light();
    setBusy(true);
    let earned = false;
    const offEarned = ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const finish = async () => {
      offEarned();
      loadedRef.current = false;
      setAvailable(false);
      try {
        if (earned) await onReward();
      } catch (e) {
        Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.tryAgain"));
      } finally {
        setBusy(false);
      }
    };
    ad.addAdEventListener(ads.AdEventType.CLOSED, finish);
    ad.show().catch(() => {
      offEarned();
      setBusy(false);
    });
  }

  return (
    <View style={styles.rewarded}>
      <View style={styles.playDot}>
        <Icon name="play" size={16} color={colors.accentForeground} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rewardedTitle}>{active ? t("boost.activeTitle") : t("boost.title")}</Text>
        <Text style={styles.rewardedBody}>{active ? t("boost.activeBody") : t("boost.body")}</Text>
      </View>
      {!active && (
        <Pressable onPress={watch} disabled={busy} style={styles.watchBtn}>
          {busy ? <ActivityIndicator size="small" color={colors.accentForeground} /> : <Text style={styles.watchText}>{t("boost.watch")}</Text>}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  iconBox: { width: 34, height: 34, borderRadius: 9, backgroundColor: "#2A2318", alignItems: "center", justifyContent: "center" },
  sponsored: { fontSize: 9, fontWeight: "700", color: colors.textFaint, letterSpacing: 0.6, textTransform: "uppercase" },
  headline: { fontSize: 12, fontWeight: "700", color: "#E9E2D4" },
  cta: { fontSize: 11, fontWeight: "800", color: colors.accent },
  rewarded: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(245,166,35,0.07)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.3)",
    borderRadius: 16,
    padding: 13,
  },
  playDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  rewardedTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  rewardedBody: { color: colors.textSecondary, fontSize: 11, marginTop: 1 },
  watchBtn: { backgroundColor: colors.accent, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, minWidth: 58, alignItems: "center" },
  watchText: { color: colors.accentForeground, fontSize: 11, fontWeight: "800" },
});
