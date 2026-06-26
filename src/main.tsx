import React from "react";
import { createRoot } from "react-dom/client";
import { ClientApp } from "./app/ClientApp";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClientApp />
  </React.StrictMode>
);
