import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
    private stars: Phaser.GameObjects.Image[] = [];

    constructor() {
        super({ key: 'MenuScene' });
    }

    create(): void {
        const { width, height } = this.cameras.main;

        // Starfield background
        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const star = this.add.image(x, y, 'star');
            star.setAlpha(Phaser.Math.FloatBetween(0.2, 0.8));
            star.setScale(Phaser.Math.FloatBetween(0.3, 1.2));
            this.stars.push(star);

            // Twinkle animation
            this.tweens.add({
                targets: star,
                alpha: Phaser.Math.FloatBetween(0.1, 0.4),
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        // Title
        const title = this.add.text(width / 2, height / 2 - 120, '🚀 SPACE SHOOTER', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '52px',
            color: '#00ccff',
            fontStyle: 'bold',
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#00ccff',
                blur: 20,
                fill: true,
            },
        });
        title.setOrigin(0.5);

        // Title float animation
        this.tweens.add({
            targets: title,
            y: title.y - 8,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Subtitle
        const subtitle = this.add.text(width / 2, height / 2 - 55, 'DEFEND THE GALAXY', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#6688aa',
            letterSpacing: 8,
        });
        subtitle.setOrigin(0.5);

        // Play button
        const buttonBg = this.add.graphics();
        const btnX = width / 2 - 100;
        const btnY = height / 2 + 20;
        const btnW = 200;
        const btnH = 56;

        buttonBg.fillStyle(0x00aaff, 0.15);
        buttonBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
        buttonBg.lineStyle(2, 0x00ccff, 0.6);
        buttonBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);

        const playText = this.add.text(width / 2, btnY + btnH / 2, '▶  PLAY', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '24px',
            color: '#00eeff',
            fontStyle: 'bold',
        });
        playText.setOrigin(0.5);

        // Make button interactive
        const hitZone = this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
            .setInteractive({ useHandCursor: true });

        hitZone.on('pointerover', () => {
            buttonBg.clear();
            buttonBg.fillStyle(0x00ccff, 0.3);
            buttonBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
            buttonBg.lineStyle(2, 0x00eeff, 1);
            buttonBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);
            playText.setColor('#ffffff');
        });

        hitZone.on('pointerout', () => {
            buttonBg.clear();
            buttonBg.fillStyle(0x00aaff, 0.15);
            buttonBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
            buttonBg.lineStyle(2, 0x00ccff, 0.6);
            buttonBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);
            playText.setColor('#00eeff');
        });

        hitZone.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('GameScene');
            });
        });

        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const controlsLines = isTouchDevice
            ? ['🕹  JOYSTICK   MOVE', '🔴  BUTTON   SHOOT']
            : ['← →  ↑ ↓   MOVE', 'SPACE   SHOOT'];

        const controlsText = this.add.text(width / 2, height - 80, controlsLines.join('\n'), {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#445566',
            align: 'center',
            lineSpacing: 6,
        });
        controlsText.setOrigin(0.5);

        // Decorative ship
        const ship = this.add.image(width / 2, height / 2 + 130, 'player');
        ship.setScale(1.5);
        ship.setAlpha(0.3);
        this.tweens.add({
            targets: ship,
            y: ship.y - 6,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Fade in
        this.cameras.main.fadeIn(800, 0, 0, 0);
    }
}
