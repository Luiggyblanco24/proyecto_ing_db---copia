import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    server: { proxy: { '/api/chatbot/visitante': 'http://127.0.0.1:3000' } },
  },
});
