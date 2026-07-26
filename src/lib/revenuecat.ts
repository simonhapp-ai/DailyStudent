import { Purchases, PACKAGE_TYPE } from '@revenuecat/purchases-capacitor'
import { Capacitor } from '@capacitor/core'

// Set once Simon creates the RevenueCat project (Track A, Phase 5 handoff).
const REVENUECAT_API_KEY_IOS = import.meta.env.VITE_REVENUECAT_API_KEY_IOS as string | undefined

let configured = false

// Lazily configured once authUser.id is known (app is auth-gated, so this
// never runs at cold boot) — appUserID is set to the Supabase user id so
// RevenueCat webhook payloads carry the same id supabaseSync.ts looks up by.
//
// onEntitlementChange fires immediately on purchase/restore/renewal — used
// for instant on-device UI feedback instead of waiting on the webhook's
// round-trip into Supabase (the webhook write remains the durable,
// cross-device source of truth; this is purely a local, non-persisted hint).
export async function initRevenueCat(userId: string, onEntitlementChange?: (active: boolean) => void) {
  if (!Capacitor.isNativePlatform() || configured || !REVENUECAT_API_KEY_IOS) return
  await Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS, appUserID: userId })
  configured = true
  if (onEntitlementChange) {
    await Purchases.addCustomerInfoUpdateListener((info) => {
      onEntitlementChange(Object.keys(info.entitlements.active).length > 0)
    })
  }
}

export async function logOutRevenueCat() {
  if (!Capacitor.isNativePlatform() || !configured) return
  await Purchases.logOut()
  configured = false
}

export async function purchasePlan(plan: 'monthly' | 'yearly'): Promise<{ success: boolean; cancelled?: boolean; error?: string }> {
  try {
    const offerings = await Purchases.getOfferings()
    const wantType = plan === 'yearly' ? PACKAGE_TYPE.ANNUAL : PACKAGE_TYPE.MONTHLY
    const pkg = offerings.current?.availablePackages.find((p) => p.packageType === wantType)
    if (!pkg) return { success: false, error: 'Kein passendes Abo in RevenueCat gefunden.' }

    await Purchases.purchasePackage({ aPackage: pkg })
    return { success: true }
  } catch (err) {
    const rcErr = err as { userCancelled?: boolean; message?: string }
    if (rcErr.userCancelled) return { success: false, cancelled: true }
    return { success: false, error: rcErr.message ?? 'Kauf fehlgeschlagen.' }
  }
}
