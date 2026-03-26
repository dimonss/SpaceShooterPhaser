import Phaser from 'phaser';
import { authService } from '../services/AuthService';

export class MenuScene extends Phaser.Scene {
    private stars: Phaser.GameObjects.Image[] = [];
    private bestScore = 0;

    constructor() {
        super({ key: 'MenuScene' });
    }

    async create(): Promise<void> {
        const { width, height } = this.cameras.main;

        // Load best score from backend
        try {
            const fields = await authService.getFields();
            const gameData = fields.spaceShooterGame as { bestScore?: number } | undefined;
            this.bestScore = gameData?.bestScore ?? 0;
        } catch {
            this.bestScore = 0;
        }

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

        // --- User info (top-left corner) ---
        const user = authService.getUser();
        if (user) {
            const displayName = user.firstName + (user.lastName ? ` ${user.lastName}` : '');
            const userText = this.add.text(20, 16, `👤 ${displayName}`, {
                fontFamily: '"Segoe UI", Arial, sans-serif',
                fontSize: '16px',
                color: '#88aacc',
            });
            userText.setDepth(20);
        }

        // --- Best score (top-right corner) ---
        if (this.bestScore > 0) {
            const bestText = this.add.text(width - 20, 16, `🏆 BEST: ${this.bestScore}`, {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#ffcc00',
                shadow: { offsetX: 0, offsetY: 0, color: '#ffcc00', blur: 8, fill: true },
            });
            bestText.setOrigin(1, 0);
            bestText.setDepth(20);
        }

        // Title
        const title = this.add.text(width / 2, height / 2 - 140, '🚀 SPACE SHOOTER', {
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
        title.setPadding(28);

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
        const subtitle = this.add.text(width / 2, height / 2 - 75, 'DEFEND THE GALAXY', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#6688aa',
            letterSpacing: 8,
        });
        subtitle.setOrigin(0.5);

        let inputElement: Phaser.GameObjects.DOMElement | undefined;

        if (!user) {
            // === Username label ===
            const usernameLabel = this.add.text(width / 2, height / 2 - 30, 'ENTER YOUR CALLSIGN', {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#556677',
                letterSpacing: 3,
            });
            usernameLabel.setOrigin(0.5);

            // === Username input (DOM element) ===
            const inputHtml = `<input
                type="text"
                id="username-input"
                maxlength="16"
                placeholder="PILOT"
                style="
                    width: 220px;
                    padding: 10px 16px;
                    font-family: monospace;
                    font-size: 18px;
                    color: #00eeff;
                    background: rgba(0, 170, 255, 0.08);
                    border: 2px solid rgba(0, 204, 255, 0.4);
                    border-radius: 10px;
                    outline: none;
                    text-align: center;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    caret-color: #00ccff;
                    transition: border-color 0.3s, box-shadow 0.3s;
                "
                onfocus="this.style.borderColor='rgba(0,204,255,0.8)'; this.style.boxShadow='0 0 20px rgba(0,204,255,0.3)';"
                onblur="this.style.borderColor='rgba(0,204,255,0.4)'; this.style.boxShadow='none';"
            />`;

            inputElement = this.add.dom(width / 2, height / 2 + 8).createFromHTML(inputHtml);
            inputElement.setDepth(30);
        }

        // === Play button ===
        const buttonBg = this.add.graphics();
        const btnX = width / 2 - 100;
        const btnY = height / 2 + 55;
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
            let sessionUsername = 'PILOT';

            if (user) {
                // If authenticated, use the username from profile
                sessionUsername = (user.username || user.firstName || 'PILOT').toUpperCase();
            } else if (inputElement) {
                // If guest, use the provided callsign
                const input = inputElement.getChildByID('username-input') as HTMLInputElement;
                sessionUsername = (input?.value?.trim() || 'PILOT').toUpperCase();
            }

            this.registry.set('username', sessionUsername);

            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('GameScene');
            });
        });

        // === Inline Leaderboard ===
        const lbX = width / 2;
        const lbY = btnY + btnH + 30; // Centered below Play button
        
        this.add.text(lbX, lbY, '🏆 TOP 10 PILOTS', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '16px',
            color: '#ffcc00',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        authService.getLeaderboard().then(leaderboard => {
            if (!this.sys.isActive() || !this.scene.isActive()) return;
            
            if (leaderboard.length === 0) {
                this.add.text(lbX, lbY + 30, 'NO RECORDS', {
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: '#556677',
                }).setOrigin(0.5);
                return;
            }

            leaderboard.forEach((user, i) => {
                const y = lbY + 30 + i * 20;
                const nameText = user.username || user.firstName || 'UNKNOWN';
                const scoreText = user.bestScore.toString();
                
                let color = '#88aacc';
                if (i === 0) color = '#ffcc00';
                else if (i === 1) color = '#eeeeee';
                else if (i === 2) color = '#dda15e';
                
                // Rank + Name (left aligned)
                this.add.text(lbX - 80, y, `${i + 1}. ${nameText.substring(0, 10)}`, {
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: color,
                }).setOrigin(0, 0.5);

                // Score (right aligned)
                this.add.text(lbX + 80, y, scoreText, {
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: '#ffaa00',
                    fontStyle: 'bold',
                }).setOrigin(1, 0.5);
            });
        }).catch(() => {
            if (!this.sys.isActive() || !this.scene.isActive()) return;
            this.add.text(lbX, lbY + 30, 'ERROR', {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#ff4444',
            }).setOrigin(0.5);
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

        // --- Logout button (bottom-left) ---
        const logoutText = this.add.text(20, height - 40, '🚪 Logout', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#556677',
        });
        logoutText.setInteractive({ useHandCursor: true });
        logoutText.on('pointerover', () => logoutText.setColor('#ff6688'));
        logoutText.on('pointerout', () => logoutText.setColor('#556677'));
        logoutText.on('pointerdown', async () => {
            await authService.logout();
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.time.delayedCall(400, () => {
                this.scene.start('LoginScene');
            });
        });

        // Decorative ship
        const ship = this.add.image(width / 2, height / 2 + 160, 'player');
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
