import "./index.css";
import { db } from "./database/db";

db.open().catch((error: unknown) => {
  console.error("Failed to initialize Watch Log database:", error);
});

import React from "react";
import ReactDOM from "react-dom/client";

import { RouterProvider } from "react-router-dom";

import ThemeProvider from "./app/providers";

import RegionProvider from "./features/settings/region/RegionProvider";

import { router } from "./app/router";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <RegionProvider>
        <RouterProvider router={router} />
      </RegionProvider>
    </ThemeProvider>
  </React.StrictMode>

)
;