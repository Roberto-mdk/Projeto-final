import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    input: {
        principal: resolve(raiz, "index.html"),
        detalhes: resolve(raiz, "lugar.html")
    },

    server: {
        host: "0.0.0.0",
        port: 5173
    },

    preview: {
        host: "0.0.0.0"
    }
});