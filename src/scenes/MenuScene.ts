import Phaser from 'phaser';
import { authService, type TelegramLoginData } from '../services/AuthService';
import { BaseScene } from './BaseScene';

export class MenuScene extends BaseScene {
    private stars: Phaser.GameObjects.Image[] = [];
    private bestScore = 0;

    constructor() {
        super({ key: 'MenuScene' });
    }

    create(): void {
        const { width, height } = this.cameras.main;

        // --- Best score (top-right corner) ---
        // Create the text object initially hidden. We'll show it when the score loads.
        const bestText = this.add.text(width - 20, 16, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffcc00',
            shadow: { offsetX: 0, offsetY: 0, color: '#ffcc00', blur: 8, fill: true },
        });
        bestText.setOrigin(1, 0);
        bestText.setDepth(20);
        bestText.setVisible(false);

        // Load best score from backend asynchronously
        authService.getFields()
            .then((fields) => {
                if (!this.scene.isActive('MenuScene')) return;
                const gameData = fields.spaceShooterGame as { bestScore?: number } | undefined;
                this.bestScore = gameData?.bestScore ?? 0;
                
                if (this.bestScore > 0) {
                    bestText.setText(`🏆 BEST: ${this.bestScore}`);
                    bestText.setVisible(true);
                }
            })
            .catch((err) => {
                console.warn('[MenuScene] Failed to load best score:', err);
                this.bestScore = 0;
            });

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
        const provider = authService.getActiveProvider();
        const available = authService.getAvailableProviders();

        if (user) {
            const providerIcon = provider === 'google' ? '🔵' : '✈️';
            const displayName = user.firstName + (user.lastName ? ` ${user.lastName}` : '');
            const userText = this.add.text(20, 16, `👤 ${displayName} (${providerIcon} ${provider})`, {
                fontFamily: '"Segoe UI", Arial, sans-serif',
                fontSize: '15px',
                color: '#88aacc',
            });
            userText.setDepth(20);

            if (available.length > 1) {
                const nextProvider = provider === 'google' ? 'telegram' : 'google';
                const nextLabel = provider === 'google' ? '✈️ Switch to TG' : '🔵 Switch to Google';
                const switchBtn = this.add.text(20, 40, `🔄 ${nextLabel}`, {
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#55ccff',
                    backgroundColor: 'rgba(0, 50, 100, 0.5)',
                    padding: { x: 6, y: 3 },
                });
                switchBtn.setDepth(20);
                switchBtn.setInteractive({ useHandCursor: true });
                switchBtn.on('pointerover', () => switchBtn.setColor('#ffffff'));
                switchBtn.on('pointerout', () => switchBtn.setColor('#55ccff'));
                switchBtn.on('pointerdown', async () => {
                    await authService.switchProvider(nextProvider);
                    this.scene.restart();
                });
            } else if (available.length === 1) {
                const nextLabel = available[0] === 'google' ? '+ ✈️ Connect TG' : '+ 🔵 Connect Google';
                const connectBtn = this.add.text(20, 40, nextLabel, {
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#a78bfa',
                    backgroundColor: 'rgba(76, 29, 149, 0.4)',
                    padding: { x: 6, y: 3 },
                });
                connectBtn.setDepth(20);
                connectBtn.setInteractive({ useHandCursor: true });
                connectBtn.on('pointerover', () => connectBtn.setColor('#ffffff'));
                connectBtn.on('pointerout', () => connectBtn.setColor('#a78bfa'));
                connectBtn.on('pointerdown', () => {
                    this.showLogoutModal();
                });
            }
        }


        // (Best score rendering was moved to the top of create() to handle async updates)

        // Title
        const titleFontSize = width < 450 ? '36px' : '52px';
        const title = this.add.text(width / 2, height / 2 - 140, '🚀 SPACE SHOOTER', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: titleFontSize,
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
            }

            this.registry.set('username', sessionUsername);

            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.launchScene('GameScene', () =>
                    import('./GameScene').then((m) => m.GameScene),
                );
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
        logoutText.on('pointerdown', () => {
            this.showLogoutModal();
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

    private removeLogoutModal(): void {
        this.input.enabled = true;
        const existing = document.getElementById('logout-modal-overlay');
        if (existing) existing.remove();
    }

    private showLogoutModal(): void {
        this.input.enabled = false;
        this.removeLogoutModal();

        const available = authService.getAvailableProviders();
        const hasGoogle = available.includes('google');
        const hasTelegram = available.includes('telegram');

        const overlay = document.createElement('div');
        overlay.id = 'logout-modal-overlay';
        overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
        overlay.addEventListener('click', (e) => e.stopPropagation());
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(5, 10, 20, 0.85);
            backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999; padding: 16px;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #111827; border: 1px solid #374151;
            border-radius: 16px; width: 100%; max-width: 480px;
            max-height: calc(100vh - 32px); overflow-y: auto; box-sizing: border-box;
            padding: 20px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            position: relative;
        `;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute; top: 16px; right: 16px;
            background: transparent; border: none; color: #9ca3af;
            font-size: 24px; cursor: pointer; line-height: 1; padding: 4px 8px;
        `;
        closeBtn.onclick = () => this.removeLogoutModal();
        modal.appendChild(closeBtn);

        // Title
        const header = document.createElement('div');
        header.style.cssText = 'margin-bottom: 16px; padding-right: 28px;';
        header.innerHTML = `
            <div style="font-size: 18px; font-weight: 700; color: #f9fafb; display: flex; align-items: center; gap: 8px;">
                <span>🚪</span> Выход из аккаунта
            </div>
            <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">Управление активными сессиями</div>
        `;
        modal.appendChild(header);

        // SSO Warning
        const warning = document.createElement('div');
        warning.style.cssText = `
            background: rgba(245, 158, 11, 0.12);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 12px; padding: 12px 14px; margin-bottom: 20px;
            font-size: 12px; line-height: 1.45; color: #fde68a;
        `;
        warning.innerHTML = `
            <div style="font-weight: 600; color: #fbbf24; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                <span>⚠️</span> Сквозная авторизация chalysh.pro
            </div>
            Выход будет выполнен во всех подключенных веб-приложениях экосистемы (HealthChecker, Брелоки, Ретроспектива, Валидатор ТЗ, Space Shooter, ChalyshAuth).
        `;
        modal.appendChild(warning);

        // Body: 2 providers vs 1 provider
        const body = document.createElement('div');
        body.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

        const btnStyle = (bg: string, color: string = '#ffffff') => `
            background: ${bg}; color: ${color}; border: none; border-radius: 8px;
            padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
            transition: opacity 0.2s; white-space: nowrap; flex-shrink: 0;
        `;

        if (hasGoogle && hasTelegram) {
            // Option Google
            const gRow = document.createElement('div');
            gRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 12px; border-radius: 10px; background: #1f2937; border: 1px solid #374151;';
            gRow.innerHTML = `
                <div style="flex: 1 1 200px;">
                    <div style="font-size: 14px; font-weight: 600; color: #93c5fd;">🔵 Google</div>
                    <div style="font-size: 11px; color: #9ca3af;">Завершить сессию Google (Telegram останется)</div>
                </div>
            `;
            const gBtn = document.createElement('button');
            gBtn.textContent = 'Выйти из Google';
            gBtn.style.cssText = btnStyle('#374151', '#ffffff');
            gBtn.onclick = async () => {
                gBtn.disabled = true;
                await authService.logout('google');
                this.removeLogoutModal();
                this.scene.restart();
            };
            gRow.appendChild(gBtn);
            body.appendChild(gRow);

            // Option Telegram
            const tRow = document.createElement('div');
            tRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 12px; border-radius: 10px; background: #1f2937; border: 1px solid #374151;';
            tRow.innerHTML = `
                <div style="flex: 1 1 200px;">
                    <div style="font-size: 14px; font-weight: 600; color: #38bdf8;">✈️ Telegram</div>
                    <div style="font-size: 11px; color: #9ca3af;">Завершить сессию Telegram (Google останется)</div>
                </div>
            `;
            const tBtn = document.createElement('button');
            tBtn.textContent = 'Выйти из Telegram';
            tBtn.style.cssText = btnStyle('#374151', '#ffffff');
            tBtn.onclick = async () => {
                tBtn.disabled = true;
                await authService.logout('telegram');
                this.removeLogoutModal();
                this.scene.restart();
            };
            tRow.appendChild(tBtn);
            body.appendChild(tRow);

            // Option All
            const allRow = document.createElement('div');
            allRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 12px; border-radius: 10px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3);';
            allRow.innerHTML = `
                <div style="flex: 1 1 200px;">
                    <div style="font-size: 14px; font-weight: 600; color: #f87171;">🚪 Выйти со всех сразу</div>
                    <div style="font-size: 11px; color: #9ca3af;">Полный выход из обоих аккаунтов</div>
                </div>
            `;
            const allBtn = document.createElement('button');
            allBtn.textContent = 'Выйти со всех';
            allBtn.style.cssText = btnStyle('#dc2626', '#ffffff');
            allBtn.onclick = async () => {
                allBtn.disabled = true;
                await authService.logout('all');
                this.removeLogoutModal();
                this.scene.start('LoginScene');
            };
            allRow.appendChild(allBtn);
            body.appendChild(allRow);
        } else {
            // Single provider
            const activeName = hasGoogle ? '🔵 Google (активен)' : '✈️ Telegram (активен)';
            const singleRow = document.createElement('div');
            singleRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 12px; border-radius: 10px; background: #1f2937; border: 1px solid #374151;';
            singleRow.innerHTML = `
                <div style="flex: 1 1 200px;">
                    <div style="font-size: 14px; font-weight: 600; color: #e5e7eb;">${activeName}</div>
                    <div style="font-size: 11px; color: #9ca3af;">Текущая сессия</div>
                </div>
            `;
            const outBtn = document.createElement('button');
            outBtn.textContent = 'Выйти со всех сервисов';
            outBtn.style.cssText = btnStyle('#dc2626', '#ffffff');
            outBtn.onclick = async () => {
                outBtn.disabled = true;
                await authService.logout('all');
                this.removeLogoutModal();
                this.scene.start('LoginScene');
            };
            singleRow.appendChild(outBtn);
            body.appendChild(singleRow);

            // Connect second provider section
            const connectBox = document.createElement('div');
            connectBox.style.cssText = 'padding: 14px; border-radius: 12px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); text-align: center;';
            connectBox.innerHTML = `
                <div style="font-size: 13px; font-weight: 600; color: #93c5fd; margin-bottom: 4px;">
                    Войти другим способом (без выхода)
                </div>
                <div style="font-size: 11px; color: #9ca3af; margin-bottom: 12px;">
                    ${hasGoogle ? 'Подключите Telegram, чтобы свободно переключаться между ними:' : 'Подключите Google, чтобы свободно переключаться между ними:'}
                </div>
                <div id="modal-second-provider-container" style="display: flex; justify-content: center; min-height: 40px; align-items: center;"></div>
            `;
            body.appendChild(connectBox);
        }

        modal.appendChild(body);

        // Footer Cancel
        const footer = document.createElement('div');
        footer.style.cssText = 'display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 14px; border-top: 1px solid #374151;';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Отмена';
        cancelBtn.style.cssText = btnStyle('#374151', '#d1d5db');
        cancelBtn.onclick = () => this.removeLogoutModal();
        footer.appendChild(cancelBtn);
        modal.appendChild(footer);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // If single provider, render second provider widget
        if (!hasGoogle || !hasTelegram) {
            const container = document.getElementById('modal-second-provider-container');
            if (container) {
                if (hasGoogle) {
                    (window as unknown as Record<string, unknown>).__onTelegramModalAuth = async (data: TelegramLoginData) => {
                        try {
                            await authService.loginWithTelegram(data);
                            this.removeLogoutModal();
                            this.scene.restart();
                        } catch (e) {
                            console.error('Telegram link error', e);
                        }
                    };
                    const script = document.createElement('script');
                    script.async = true;
                    script.src = 'https://telegram.org/js/telegram-widget.js?22';
                    script.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_NAME || '');
                    script.setAttribute('data-size', 'medium');
                    script.setAttribute('data-radius', '8');
                    script.setAttribute('data-onauth', '__onTelegramModalAuth(user)');
                    script.setAttribute('data-request-access', 'write');
                    container.appendChild(script);
                } else {
                    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
                    if (clientId) {
                        const initG = () => {
                            const google = (window as any).google;
                            if (google?.accounts?.id) {
                                google.accounts.id.initialize({
                                    client_id: clientId,
                                    callback: async (resp: { credential: string }) => {
                                        try {
                                            await authService.loginWithGoogle(resp.credential);
                                            this.removeLogoutModal();
                                            this.scene.restart();
                                        } catch (e) {
                                            console.error('Google link error', e);
                                        }
                                    },
                                });
                                google.accounts.id.renderButton(container, {
                                    theme: 'filled_black',
                                    size: 'medium',
                                    shape: 'pill',
                                });
                            }
                        };
                        const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
                        if (existingScript) {
                            initG();
                        } else {
                            const script = document.createElement('script');
                            script.src = 'https://accounts.google.com/gsi/client';
                            script.async = true;
                            script.onload = () => initG();
                            document.head.appendChild(script);
                        }
                    }
                }
            }
        }
    }
}
