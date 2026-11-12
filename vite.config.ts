import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  publicDir: false,
  	build: {
		cssCodeSplit: false,
		lib: {
			entry: path.resolve(__dirname, "src/index.tsx"),
			name: "avro-bangla-suggestions",
			formats: ["es", "cjs"],
			fileName: (format) => (format === "es" ? "index.es.js" : "index.cjs"),
		},
		rollupOptions: {
			// The engine stays an external dependency: consumer bundlers resolve
			// `avro-bangla-engine` themselves and lazy-load it as their own chunk.
			external: ["react", /^avro-bangla-engine(\/|$)/],
		},
		sourcemap: false,
		emptyOutDir: true,
	},
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    dts({
      include: ["src"],
      exclude: ["src/main.tsx", "src/App.tsx", "src/App.css", "src/index.css"],
      tsconfigPath: "./tsconfig.app.json",
      insertTypesEntry: true,
    }),
  ],
})
