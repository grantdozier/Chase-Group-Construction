import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  // For GitHub Pages deployment at https://<user>.github.io/chase-group-construction/
  base: '/chase-group-construction/',
});
