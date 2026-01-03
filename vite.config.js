// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // ⬇️ IMPORTANT: change this to your repo name
  base: "/wings_public_calendar/",
});
