import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { APP_NAME, QR_COLORS, SHARE_TEXT } from "../variant/config";

type Props = { url: string; onBack: () => void };

export default function ShareScreen({ url, onBack }: Props) {
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator.share === "function";

  // Wird im Gerät erzeugt – funktioniert auch offline.
  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 1, color: QR_COLORS })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [url]);

  async function share() {
    try {
      if (canShare) {
        await navigator.share({ title: APP_NAME, text: SHARE_TEXT, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      // Teilen abgebrochen oder nicht erlaubt
    }
  }

  return (
    <main className="screen setup share">
      <h1 className="title">App teilen</h1>
      <div className="qr" data-testid="qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="hint">Mit der Kamera scannen</p>
      <p className="share-url">{url}</p>

      <section className="panel">
        <h2>Installieren</h2>
        <p>
          <strong>iPhone:</strong> Link in Safari öffnen → Teilen-Symbol → „Zum Home-Bildschirm“
        </p>
        <p>
          <strong>Android:</strong> Link in Chrome öffnen → Menü ⋮ → „App installieren“
        </p>
      </section>

      <button type="button" className="primary" onClick={share}>
        {canShare ? "Link teilen" : "Link kopieren"}
      </button>
      {copied && <p className="hint">Kopiert!</p>}
      <nav className="setup-links">
        <button type="button" onClick={onBack}>
          Zurück
        </button>
      </nav>
    </main>
  );
}
