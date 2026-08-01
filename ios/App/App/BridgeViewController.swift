import UIKit
import Capacitor
import WebKit

/// Makes the native WebView shell feel like a real iOS app instead of a
/// wrapped website: locks the outer scroll view so it hard-stops at the
/// content edges instead of rubber-banding (Simon: the bounce motion looked
/// bad in normal use, removed app-wide — see also `overscroll-behavior: none`
/// in src/index.css, which locks the same way for every CSS-level
/// `overflow-y-auto` panel, e.g. the iPad/desktop main content pane next to
/// the sidebar, which is a separate scroll region from this one and isn't
/// reachable from native code), and exposes two small JS-callable bridges
/// (kept separate from Capacitor's own message handlers) so the web app can
/// push its real state into native code:
///
/// - "themeBridge": the web app's OWN light/dark theme (Hell/Dunkel/System
///   in ProfilErscheinungsbildScreen) is independent of the device's OS-level
///   appearance setting — a user can pin the app to light mode while their
///   phone is in system dark mode. Reading UITraitCollection alone would get
///   this wrong, so the web app posts its actually-resolved `.dark` class
///   state here instead, and that becomes the source of truth once received.
/// - "recenterBridge": `window.scrollTo()` only moves the web page's logical
///   scroll position — it doesn't reliably reset an already in-flight native
///   UIScrollView animation (deceleration, or a spring settling back from a
///   momentary drag past the now-locked edge). The nav bar calls this on
///   every tap to force the scroll view back to (0,0), like pressing a
///   physical "recenter" button.
class BridgeViewController: CAPBridgeViewController {

    // Source of truth once the web app's first themeBridge message arrives;
    // nil (falls back to the OS trait collection) only until then.
    private var isDarkOverride: Bool?

    override func viewDidLoad() {
        super.viewDidLoad()

        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false

        // Transparent WebView + a plain background color behind it. With
        // bounce disabled this should never actually become visible during
        // normal scrolling, but it's a cheap guard against the native view
        // flashing the wrong-theme color for a frame during launch/rotation
        // before the page's own CSS background has painted.
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear
        updateBackgroundColor()

        webView?.configuration.userContentController.add(self, name: "themeBridge")
        webView?.configuration.userContentController.add(self, name: "recenterBridge")
    }

    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "themeBridge")
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "recenterBridge")
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        // Once the web app has told us its real theme, the OS-level trait
        // collection is no longer relevant — the in-app setting wins.
        if isDarkOverride == nil, traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            updateBackgroundColor()
        }
    }

    private func updateBackgroundColor() {
        let isDark = isDarkOverride ?? (traitCollection.userInterfaceStyle == .dark)
        // Exact match to src/index.css `--color-bg` (light: rgb(244,244,244),
        // dark: rgb(0,0,0)) so the overscroll area blends into the real page
        // background with no visible seam.
        view.backgroundColor = isDark
            ? UIColor(red: 0, green: 0, blue: 0, alpha: 1)
            : UIColor(red: 0xF4 / 255, green: 0xF4 / 255, blue: 0xF4 / 255, alpha: 1)
    }
}

extension BridgeViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "themeBridge":
            guard let isDark = message.body as? Bool else { return }
            isDarkOverride = isDark
            updateBackgroundColor()
        case "recenterBridge":
            guard let scrollView = webView?.scrollView else { return }
            // A single animated setContentOffset can lose to an already
            // in-flight deceleration animation. Cancel whatever's currently
            // running first, then drive a fresh explicit animation to (0,0)
            // that isn't fighting anything.
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
