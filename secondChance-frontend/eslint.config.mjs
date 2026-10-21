import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
 {
    ignores: [
      "node_modules/",
      "dist/",       // Vite build output
      "build/",      // Create React App build output
      "coverage/",   // Test coverage reports
      "vite.config.js" // Optional: ignore configuration files if desired
    ]
  },
  { files: ["**/*.{js,mjs,cjs,jsx}"], 
    plugins: { js }, 
    extends: ["js/recommended"], 
    languageOptions: { 
      globals: globals.browser,

     } },
  pluginReact.configs.flat.recommended,
]);
