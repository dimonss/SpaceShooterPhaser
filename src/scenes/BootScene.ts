import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload(): void {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222255, 0.8);
        progressBox.fillRoundedRect(width / 2 - 160, height / 2 - 15, 320, 30, 8);

        const loadingText = this.add.text(width / 2, height / 2 - 40, 'LOADING...', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#00ccff',
        });
        loadingText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ccff, 1);
            progressBar.fillRoundedRect(width / 2 - 155, height / 2 - 10, 310 * value, 20, 6);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // Generate all textures programmatically
        this.generateTextures();
    }

    create(): void {
        this.scene.start('MenuScene');
    }

    private generateTextures(): void {
        // === Player ship ===
        const shipGfx = this.make.graphics({ x: 0, y: 0 });
        // Glow
        shipGfx.fillStyle(0x00ccff, 0.15);
        shipGfx.fillCircle(32, 32, 28);
        // Body
        shipGfx.fillStyle(0x00aaff, 1);
        shipGfx.beginPath();
        shipGfx.moveTo(32, 4);
        shipGfx.lineTo(56, 56);
        shipGfx.lineTo(32, 46);
        shipGfx.lineTo(8, 56);
        shipGfx.closePath();
        shipGfx.fillPath();
        // Cockpit
        shipGfx.fillStyle(0x66eeff, 1);
        shipGfx.beginPath();
        shipGfx.moveTo(32, 14);
        shipGfx.lineTo(40, 38);
        shipGfx.lineTo(32, 34);
        shipGfx.lineTo(24, 38);
        shipGfx.closePath();
        shipGfx.fillPath();
        // Engine glow
        shipGfx.fillStyle(0xff6600, 0.8);
        shipGfx.fillCircle(24, 52, 4);
        shipGfx.fillCircle(40, 52, 4);
        shipGfx.generateTexture('player', 64, 64);
        shipGfx.destroy();

        // === Bullet ===
        const bulletGfx = this.make.graphics({ x: 0, y: 0 });
        bulletGfx.fillStyle(0x00ffcc, 0.3);
        bulletGfx.fillCircle(4, 8, 4);
        bulletGfx.fillStyle(0x00ffff, 1);
        bulletGfx.fillRect(2, 0, 4, 16);
        bulletGfx.fillStyle(0xffffff, 1);
        bulletGfx.fillRect(3, 2, 2, 12);
        bulletGfx.generateTexture('bullet', 8, 16);
        bulletGfx.destroy();

        // === Asteroids (3 variants) ===
        for (let i = 0; i < 3; i++) {
            const asteroidGfx = this.make.graphics({ x: 0, y: 0 });
            const size = 48;
            const cx = size / 2;
            const cy = size / 2;
            const colors = [0x887766, 0x998877, 0x776655];

            asteroidGfx.fillStyle(colors[i], 1);
            asteroidGfx.beginPath();
            const points = 8 + i * 2;
            for (let j = 0; j < points; j++) {
                const angle = (j / points) * Math.PI * 2;
                const radius = 16 + Math.sin(j * 3.7 + i * 2) * 5;
                const x = cx + Math.cos(angle) * radius;
                const y = cy + Math.sin(angle) * radius;
                if (j === 0) asteroidGfx.moveTo(x, y);
                else asteroidGfx.lineTo(x, y);
            }
            asteroidGfx.closePath();
            asteroidGfx.fillPath();

            // Crater details
            asteroidGfx.fillStyle(0x554433, 0.5);
            asteroidGfx.fillCircle(cx - 4 + i * 3, cy - 2 + i * 2, 4);
            asteroidGfx.fillCircle(cx + 5 - i * 2, cy + 4 - i, 3);

            asteroidGfx.generateTexture(`asteroid${i}`, size, size);
            asteroidGfx.destroy();
        }

        // === Explosion particle ===
        const particleGfx = this.make.graphics({ x: 0, y: 0 });
        particleGfx.fillStyle(0xffaa33, 1);
        particleGfx.fillCircle(4, 4, 4);
        particleGfx.fillStyle(0xffffff, 0.8);
        particleGfx.fillCircle(4, 4, 2);
        particleGfx.generateTexture('particle', 8, 8);
        particleGfx.destroy();

        // === Star ===
        const starGfx = this.make.graphics({ x: 0, y: 0 });
        starGfx.fillStyle(0xffffff, 1);
        starGfx.fillCircle(2, 2, 2);
        starGfx.generateTexture('star', 4, 4);
        starGfx.destroy();

        // === Power-up (shield) ===
        const powerGfx = this.make.graphics({ x: 0, y: 0 });
        powerGfx.fillStyle(0x00ff88, 0.2);
        powerGfx.fillCircle(16, 16, 16);
        powerGfx.fillStyle(0x00ff88, 0.5);
        powerGfx.fillCircle(16, 16, 10);
        powerGfx.fillStyle(0x00ffaa, 1);
        powerGfx.fillCircle(16, 16, 5);
        powerGfx.generateTexture('powerup', 32, 32);
        powerGfx.destroy();
    }
}
