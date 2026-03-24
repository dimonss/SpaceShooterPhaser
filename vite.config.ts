import { defineConfig } from 'vite';

export default defineConfig({
    base: '/space_shooter/',
    // Activate for local development
    // base: '/dev/',
    // Activate for use ngrok
    // server: {
    //     allowedHosts: true,
    // },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
});
