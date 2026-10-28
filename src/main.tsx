import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { captureInstallPrompt } from "./install";
import "./variant/theme.css";
import "./styles.css";

captureInstallPrompt();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
