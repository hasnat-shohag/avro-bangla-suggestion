import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  	build: {
		cssCodeSplit: false,
		lib: {
			entry: path.resolve(__dirname, "src/index.tsx"),
			name: "avro-bangla-suggestions",
			fileName: (format) => `index.${format}.js`,
		},
		rollupOptions: {
			external: ["react", "react-dom"],
			output: {
				globals: {
					react: "React",
					"react-dom": "ReactDOM",
				},
			},
		},
		sourcemap: true,
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
