import InstallInstructions from "../components/InstallInstructions";
import type { Platform } from "../install";
import { APP_NAME } from "../variant/config";

type Props = {
  platform: Platform;
  canPrompt: boolean;
  onPrompt: () => void;
  onClose: () => void;
};

export default function InstallScreen({ platform, canPrompt, onPrompt, onClose }: Props) {
  if (platform === "installed") return null;
  const oneTap = platform === "android" && canPrompt;
  return (
    <main className="screen setup">
      <h1 className="title">Aufs Handy holen</h1>
      <section className="panel install-panel">
        <p className="install-lead">
          Mit {APP_NAME} auf dem Home-Bildschirm startet das Spiel wie eine App – auch ohne Internet.
        </p>
        {oneTap ? (
          <button type="button" className="primary" onClick={onPrompt}>App installieren</button>
        ) : (
          <InstallInstructions platform={platform} />
        )}
      </section>
      <button type="button" className={oneTap ? undefined : "primary"} onClick={onClose}>
        {oneTap ? "Später" : "Fertig"}
      </button>
    </main>
  );
}
