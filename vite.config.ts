import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
    const isDev = command === 'serve';
    return {
        // Automatically use /dev/ for local proxy (npm run dev) and /space_shooter/ for prod (npm run build)
        base: isDev ? '/dev/' : '/space_shooter/',
        server: isDev ? {
            // Allows ngrok / SSH tunnel domains
            allowedHosts: true,
        } : undefined,
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
        },
    };
});
