import UIKit
import Capacitor

/// Makes the native WebView shell feel like a real iOS app instead of a
/// wrapped website: guarantees the elastic rubber-band bounce (Capacitor's
/// default didn't reliably show it), and replaces the flat black/white
/// reveal during that bounce with a themed gradient fading into the brand
/// purple, at both the top and bottom edge.
class BridgeViewController: CAPBridgeViewController {

    private let edgeGradientLayer = CAGradientLayer()

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

        edgeGradientLayer.locations = [0, 0.5, 1]
        view.layer.insertSublayer(edgeGradientLayer, at: 0)
        updateGradientColors()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        edgeGradientLayer.frame = view.bounds
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            updateGradientColors()
        }
    }

    private func updateGradientColors() {
        let isDark = traitCollection.userInterfaceStyle == .dark
        let edgeColor = isDark
            ? UIColor(red: 0x0a / 255, green: 0x0a / 255, blue: 0x0f / 255, alpha: 1)
            : UIColor.white
        let purple = UIColor(red: 0x7C / 255, green: 0x3A / 255, blue: 0xED / 255, alpha: 1)
        edgeGradientLayer.colors = [edgeColor.cgColor, purple.cgColor, edgeColor.cgColor]
    }
}
