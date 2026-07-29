import UIKit
import Capacitor
import WebKit

/// Makes the native WebView shell feel like a real iOS app instead of a
/// wrapped website: guarantees the elastic rubber-band bounce (Capacitor's
/// default didn't reliably show it), replaces the flat black/white reveal
/// during that bounce with a themed gradient — brand purple right at the
/// true screen edge, fading into the exact page background color toward
/// the content — at both the top and bottom edge, and exposes two small
/// JS-callable bridges (kept separate from Capacitor's own message
/// handlers) so the web app can push its real state into native code:
///
/// - "themeBridge": the web app's OWN light/dark theme (Hell/Dunkel/System
///   in ProfilErscheinungsbildScreen) is independent of the device's OS-level
///   appearance setting — a user can pin the app to light mode while their
///   phone is in system dark mode. Reading UITraitCollection alone would get
///   this wrong, so the web app posts its actually-resolved `.dark` class
///   state here instead, and that becomes the source of truth once received.
/// - "recenterBridge": `window.scrollTo()` only moves the web page's logical
///   scroll position — it cannot reliably cancel an in-flight native
///   rubber-band bounce, which is a separate UIScrollView animation. The nav
///   bar calls this on every tap to force the scroll view back to (0,0),
///   like pressing a physical "recenter" button.
class BridgeViewController: CAPBridgeViewController {

    private let edgeGradientLayer = CAGradientLayer()
    // Source of truth once the web app's first themeBridge message arrives;
    // nil (falls back to the OS trait collection) only until then.
    private var isDarkOverride: Bool?

    override func viewDidLoad() {
        super.viewDidLoad()

        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true

        // Transparent WebView + a gradient behind it — the page's own CSS
        // background still paints opaquely over normal content, so this is
        // only ever visible in the overscroll area beyond the page bounds.
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear

        // Purple sits right at the true screen edge (top/bottom) and fades
        // into the background color over a short band as it approaches the
        // content — not the other way around. The layer always spans the
        // full, unchanging screen bounds (only scrollView.contentOffset
        // moves during a bounce), so a location fraction here maps to a
        // fixed point-distance from each edge regardless of pull distance.
        edgeGradientLayer.locations = [0, 0.15, 0.85, 1]
        view.layer.insertSublayer(edgeGradientLayer, at: 0)
        updateGradientColors()

        webView?.configuration.userContentController.add(self, name: "themeBridge")
        webView?.configuration.userContentController.add(self, name: "recenterBridge")
    }

    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "themeBridge")
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "recenterBridge")
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        edgeGradientLayer.frame = view.bounds
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        // Once the web app has told us its real theme, the OS-level trait
        // collection is no longer relevant — the in-app setting wins.
        if isDarkOverride == nil, traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            updateGradientColors()
        }
    }

    private func updateGradientColors() {
        let isDark = isDarkOverride ?? (traitCollection.userInterfaceStyle == .dark)
        // Exact match to src/index.css `--color-bg` (light: rgb(244,244,244),
        // dark: rgb(0,0,0)) so the gradient blends into the real page
        // background with no visible seam — not an approximate brand black.
        let edgeColor = isDark
            ? UIColor(red: 0, green: 0, blue: 0, alpha: 1)
            : UIColor(red: 0xF4 / 255, green: 0xF4 / 255, blue: 0xF4 / 255, alpha: 1)
        let purple = UIColor(red: 0x7C / 255, green: 0x3A / 255, blue: 0xED / 255, alpha: 1)
        edgeGradientLayer.colors = [purple.cgColor, edgeColor.cgColor, edgeColor.cgColor, purple.cgColor]
    }
}

extension BridgeViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "themeBridge":
            guard let isDark = message.body as? Bool else { return }
            isDarkOverride = isDark
            updateGradientColors()
        case "recenterBridge":
            guard let scrollView = webView?.scrollView else { return }
            // A single animated setContentOffset can lose to an already-
            // in-flight native rubber-band recoil — most reliably true for
            // the top-overscroll direction (negative contentOffset), which
            // can get stuck open with nothing forcing it closed, especially
            // on screens where alwaysBounceVertical is forcing a bounce on
            // content that doesn't actually overflow the viewport. Cancel
            // whatever spring/decelerate animation is currently running
            // first, then drive a fresh explicit animation to (0,0) that
            // isn't fighting anything.
            scrollView.setContentOffset(scrollView.contentOffset, animated: false)
            UIView.animate(
                withDuration: 0.35,
                delay: 0,
                usingSpringWithDamping: 0.85,
                initialSpringVelocity: 0,
                options: [.allowUserInteraction, .beginFromCurrentState],
                animations: {
                    scrollView.contentOffset = .zero
                }
            )
        default:
            break
        }
    }
}
