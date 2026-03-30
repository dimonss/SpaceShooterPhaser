import Phaser from 'phaser';
import { authService, type TelegramLoginData } from '../services/AuthService';
import { BaseScene } from './BaseScene';

/**
 * LoginScene — shown before the game menu if the user is not authenticated.
 *
 * Displays a "Login with Telegram" button that opens the Telegram Login Widget
 * as an HTML overlay on top of the game canvas.
 */
export class LoginScene extends BaseScene {
    private stars: Phaser.GameObjects.Image[] = [];

    constructor() {
        super({ key: 'LoginScene' });
    }

    create(): void {
        const { width, height } = this.cameras.main;

        // Generate star texture if it doesn't exist yet (LoginScene runs before BootScene)
        if (!this.textures.exists('star')) {
            const gfx = this.make.graphics({ x: 0, y: 0 });
            gfx.fillStyle(0xffffff, 1);
            gfx.fillCircle(2, 2, 2);
            gfx.generateTexture('star', 4, 4);
            gfx.destroy();
        }

        // --- Try to restore existing session (non-blocking) ------------
        // UI is built immediately below; if session is valid we silently
        // transition to BootScene before the user interacts.
        if (authService.isLoggedIn()) {
            authService
                .tryRestoreSession()
                .then((restored) => {
                    if (restored && this.scene.isActive('LoginScene')) {
                        this.launchScene('BootScene', () =>
                            import('./BootScene').then((m) => m.BootScene),
                        );
                    }
                })
                .catch((err: unknown) => {
                    console.warn('[LoginScene] Session restore failed:', err);
                    // Login UI is already visible — user can log in manually
                });
        }

        // --- Starfield -------------------------------------------------
        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const star = this.add.image(x, y, 'star');
            star.setAlpha(Phaser.Math.FloatBetween(0.2, 0.8));
            star.setScale(Phaser.Math.FloatBetween(0.3, 1.2));
            this.stars.push(star);

            this.tweens.add({
                targets: star,
                alpha: Phaser.Math.FloatBetween(0.1, 0.4),
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        // --- Title -----------------------------------------------------
        const titleFontSize = width < 450 ? '36px' : '52px';
        const title = this.add.text(width / 2, height / 2 - 120, '🚀 SPACE SHOOTER', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: titleFontSize,
            color: '#00ccff',
            fontStyle: 'bold',
            shadow: {
                offsetX: 0, offsetY: 0,
                color: '#00ccff', blur: 20, fill: true,
            },
        });
        title.setOrigin(0.5);

        this.tweens.add({
            targets: title,
            y: title.y - 8,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // --- Subtitle --------------------------------------------------
        const subtitle = this.add.text(width / 2, height / 2 - 55, 'DEFEND THE GALAXY', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#6688aa',
            letterSpacing: 8,
        });
        subtitle.setOrigin(0.5);

        // --- Login button (Phaser graphics) ----------------------------
        const btnW = 280;
        const btnH = 56;
        const btnX = width / 2 - btnW / 2;
        const btnY = height / 2 + 20;

        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(0x229ED9, 0.2);
        buttonBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
        buttonBg.lineStyle(2, 0x229ED9, 0.6);
        buttonBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);

        const loginText = this.add.text(width / 2, btnY + btnH / 2, '✈  LOGIN WITH TELEGRAM', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '20px',
            color: '#5BC5F2',
            fontStyle: 'bold',
        });
        loginText.setOrigin(0.5);

        const hitZone = this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
            .setInteractive({ useHandCursor: true });

        hitZone.on('pointerover', () => {
            buttonBg.clear();
            buttonBg.fillStyle(0x229ED9, 0.4);
            buttonBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
            buttonBg.lineStyle(2, 0x5BC5F2, 1);
            buttonBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);
            loginText.setColor('#ffffff');
        });

        hitZone.on('pointerout', () => {
            buttonBg.clear();
            buttonBg.fillStyle(0x229ED9, 0.2);
            buttonBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
            buttonBg.lineStyle(2, 0x229ED9, 0.6);
            buttonBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);
            loginText.setColor('#5BC5F2');
        });

        hitZone.on('pointerdown', () => {
            this.showTelegramWidget();
        });

        // --- Google Login button ---------------------------------------
        const gBtnY = btnY + btnH + 16;
        const gBtnBg = this.add.graphics();
        gBtnBg.fillStyle(0xdd4b39, 0.2);
        gBtnBg.fillRoundedRect(btnX, gBtnY, btnW, btnH, 12);
        gBtnBg.lineStyle(2, 0xdd4b39, 0.6);
        gBtnBg.strokeRoundedRect(btnX, gBtnY, btnW, btnH, 12);

        const gLoginText = this.add.text(width / 2, gBtnY + btnH / 2, '🔵  LOGIN WITH GOOGLE', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '20px',
            color: '#ea4335',
            fontStyle: 'bold',
        });
        gLoginText.setOrigin(0.5);

        const gHitZone = this.add.zone(width / 2, gBtnY + btnH / 2, btnW, btnH)
            .setInteractive({ useHandCursor: true });

        gHitZone.on('pointerover', () => {
            gBtnBg.clear();
            gBtnBg.fillStyle(0xdd4b39, 0.4);
            gBtnBg.fillRoundedRect(btnX, gBtnY, btnW, btnH, 12);
            gBtnBg.lineStyle(2, 0xea4335, 1);
            gBtnBg.strokeRoundedRect(btnX, gBtnY, btnW, btnH, 12);
            gLoginText.setColor('#ffffff');
        });

        gHitZone.on('pointerout', () => {
            gBtnBg.clear();
            gBtnBg.fillStyle(0xdd4b39, 0.2);
            gBtnBg.fillRoundedRect(btnX, gBtnY, btnW, btnH, 12);
            gBtnBg.lineStyle(2, 0xdd4b39, 0.6);
            gBtnBg.strokeRoundedRect(btnX, gBtnY, btnW, btnH, 12);
            gLoginText.setColor('#ea4335');
        });

        gHitZone.on('pointerdown', () => {
            this.showGoogleSignIn();
        });

        // --- Info text -------------------------------------------------
        const info = this.add.text(width / 2, height - 40, 'Sign in to save your best score globally', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#445566',
            align: 'center',
        });
        info.setOrigin(0.5);

        // Fade in
        this.cameras.main.fadeIn(800, 0, 0, 0);
    }

    /* ---------------------------------------------------------------- */
    /*  Telegram Login Widget (HTML overlay)                             */
    /* ---------------------------------------------------------------- */

    private showTelegramWidget(): void {
        this.input.enabled = false;
        
        // Remove any existing overlay
        this.removeTelegramOverlay();

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'telegram-login-overlay';
        overlay.addEventListener('pointerdown', e => e.stopPropagation());
        overlay.addEventListener('click', e => e.stopPropagation());
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            z-index: 9999;
        `;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute; top: 20px; right: 24px;
            background: none; border: none;
            color: #aaa; font-size: 32px;
            cursor: pointer; line-height: 1;
        `;
        closeBtn.addEventListener('click', () => this.removeTelegramOverlay());
        overlay.appendChild(closeBtn);

        // Instruction text
        const text = document.createElement('p');
        text.textContent = 'Нажмите кнопку ниже для входа через Telegram';
        text.style.cssText = `
            color: #aabbcc; font-family: monospace;
            font-size: 14px; margin-bottom: 24px;
        `;
        overlay.appendChild(text);

        // Widget container
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'telegram-widget-container';
        overlay.appendChild(widgetContainer);

        document.body.appendChild(overlay);

        // Register the global callback BEFORE creating the script
        (window as unknown as Record<string, unknown>).__onTelegramAuth = (
            data: TelegramLoginData,
        ) => {
            this.handleTelegramCallback(data);
        };

        // Inject Telegram Widget script
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', 'ChalyshAuthBot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '8');
        script.setAttribute('data-onauth', '__onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        widgetContainer.appendChild(script);
    }

    private async handleTelegramCallback(data: TelegramLoginData): Promise<void> {
        this.removeTelegramOverlay();

        try {
            await authService.loginWithTelegram(data);
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.launchScene('BootScene', () =>
                    import('./BootScene').then((m) => m.BootScene),
                );
            });
        } catch (err) {
            console.error('Telegram login error:', err);
            const { width, height } = this.cameras.main;
            const errText = this.add.text(width / 2, height / 2 + 110, 'Login failed. Try again.', {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#ff4466',
            });
            errText.setOrigin(0.5);
            this.time.delayedCall(3000, () => errText.destroy());
        }
    }

    private removeTelegramOverlay(): void {
        this.input.enabled = true;
        const existing = document.getElementById('telegram-login-overlay');
        if (existing) existing.remove();
    }

    /* ---------------------------------------------------------------- */
    /*  Google Sign-In (GSI One Tap / Button)                            */
    /* ---------------------------------------------------------------- */

    private showGoogleSignIn(): void {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
            console.error('VITE_GOOGLE_CLIENT_ID is not set');
            return;
        }

        this.input.enabled = false;

        // Remove any existing overlay
        this.removeGoogleOverlay();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'google-login-overlay';
        overlay.addEventListener('pointerdown', e => e.stopPropagation());
        overlay.addEventListener('click', e => e.stopPropagation());
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            z-index: 9999;
        `;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute; top: 20px; right: 24px;
            background: none; border: none;
            color: #aaa; font-size: 32px;
            cursor: pointer; line-height: 1;
        `;
        closeBtn.addEventListener('click', () => this.removeGoogleOverlay());
        overlay.appendChild(closeBtn);

        // Info text
        const text = document.createElement('p');
        text.textContent = 'Войдите через Google';
        text.style.cssText = `
            color: #aabbcc; font-family: monospace;
            font-size: 14px; margin-bottom: 24px;
        `;
        overlay.appendChild(text);

        // Google button container
        const btnContainer = document.createElement('div');
        btnContainer.id = 'google-signin-button';
        overlay.appendChild(btnContainer);

        document.body.appendChild(overlay);

        // Load GSI script and render button
        const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existingScript) {
            this.initGoogleButton(clientId);
        } else {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.onload = () => this.initGoogleButton(clientId);
            document.head.appendChild(script);
        }
    }

    private initGoogleButton(clientId: string): void {
        const google = (window as any).google;
        if (!google?.accounts?.id) {
            console.error('Google Identity Services not loaded');
            return;
        }

        google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: { credential: string }) => {
                this.handleGoogleCallback(response.credential);
            },
        });

        const btnContainer = document.getElementById('google-signin-button');
        if (btnContainer) {
            google.accounts.id.renderButton(btnContainer, {
                theme: 'filled_black',
                size: 'large',
                shape: 'pill',
                width: 280,
            });
        }
    }

    private async handleGoogleCallback(idToken: string): Promise<void> {
        this.removeGoogleOverlay();

        try {
            await authService.loginWithGoogle(idToken);
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.launchScene('BootScene', () =>
                    import('./BootScene').then((m) => m.BootScene),
                );
            });
        } catch (err) {
            console.error('Google login error:', err);
            const { width, height } = this.cameras.main;
            const errText = this.add.text(width / 2, height / 2 + 110, 'Google login failed. Try again.', {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#ff4466',
            });
            errText.setOrigin(0.5);
            this.time.delayedCall(3000, () => errText.destroy());
        }
    }

    private removeGoogleOverlay(): void {
        this.input.enabled = true;
        const existing = document.getElementById('google-login-overlay');
        if (existing) existing.remove();
    }
}
