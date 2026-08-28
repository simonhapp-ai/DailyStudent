import { Purchases, PACKAGE_TYPE, INTRO_ELIGIBILITY_STATUS } from '@revenuecat/purchases-capacitor'
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

// Block 3 (Gratis-Testphase): the monthly package's introductory offer in App
// Store Connect is the 1-week free trial (RevenueCat surfaces it as
// product.introPrice with price 0). Eligibility itself is a separate,
// per-Apple-ID check — Apple only grants one free trial per subscription
// group, so a returning trial user must see plain pricing, not the trial
// copy. UNKNOWN status (RevenueCat couldn't determine eligibility) is
// treated as ineligible per RevenueCat's own guidance: better to show
// regular pricing than promise a trial that won't actually apply.
export async function checkMonthlyTrialEligibility(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !configured) return false
  try {
    const offerings = await Purchases.getOfferings()
    const monthlyPkg = offerings.current?.availablePackages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY)
    const intro = monthlyPkg?.product.introPrice
    if (!intro || intro.price > 0) return false

    const elig = await Purchases.checkTrialOrIntroductoryPriceEligibility({
      productIdentifiers: [monthlyPkg!.product.identifier],
    })
    return elig[monthlyPkg!.product.identifier]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
  } catch {
    return false
  }
}

// Apple Guideline 3.1.1: subscription apps must offer a way to restore
// previous purchases (new device, reinstall, second Apple ID device on the
// same account) — this was missing entirely before Block 5 of the Pro-Launch
// checklist. Mirrors purchasePlan()'s result shape so ProfilAccountScreen
// can reuse the same error-display pattern.
export async function restorePurchases(): Promise<{ success: boolean; hasEntitlement: boolean; error?: string }> {
  try {
    const { customerInfo } = await Purchases.restorePurchases()
    return { success: true, hasEntitlement: Object.keys(customerInfo.entitlements.active).length > 0 }
  } catch (err) {
    const rcErr = err as { message?: string }
    return { success: false, hasEntitlement: false, error: rcErr.message ?? 'Wiederherstellen fehlgeschlagen.' }
  }
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
