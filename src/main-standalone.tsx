import React from "react";
import { createRoot } from "react-dom/client";
import { StandaloneApp } from "./app/StandaloneApp";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StandaloneApp />
  </React.StrictMode>
);
