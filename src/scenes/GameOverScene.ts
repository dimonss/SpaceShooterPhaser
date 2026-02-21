import Phaser from 'phaser';
import { ScoreManager } from '../utils/ScoreManager';

export class GameOverScene extends Phaser.Scene {
    private stars: Phaser.GameObjects.Image[] = [];

    constructor() {
        super({ key: 'GameOverScene' });
    }

    create(data: { score: number; username: string }): void {
        const { width, height } = this.cameras.main;
        const finalScore = data.score ?? 0;
        const username = data.username ?? 'PILOT';

        // Save the score to localStorage
        ScoreManager.saveScore(username, finalScore);

        // Starfield
        for (let i = 0; i < 60; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const star = this.add.image(x, y, 'star');
            star.setAlpha(Phaser.Math.FloatBetween(0.1, 0.5));
            star.setScale(Phaser.Math.FloatBetween(0.3, 0.8));
            this.stars.push(star);
        }

        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x110011, 0.5);
        overlay.fillRect(0, 0, width, height);

        // Game Over title
        const title = this.add.text(width / 2, height / 2 - 160, 'GAME OVER', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '56px',
            color: '#ff4466',
            fontStyle: 'bold',
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#ff4466',
                blur: 25,
                fill: true,
            },
        });
        title.setOrigin(0.5);
        title.setPadding(32);
        title.setAlpha(0);
        this.tweens.add({
            targets: title,
            alpha: 1,
            y: title.y + 10,
            duration: 800,
            ease: 'Back.easeOut',
        });

        // Player name
        const nameLabel = this.add.text(width / 2, height / 2 - 85, username, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#00ccff',
            letterSpacing: 3,
        });
        nameLabel.setOrigin(0.5);
        nameLabel.setAlpha(0);

        // Score label
        const scoreLabel = this.add.text(width / 2, height / 2 - 60, 'FINAL SCORE', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#6688aa',
            letterSpacing: 4,
        });
        scoreLabel.setOrigin(0.5);
        scoreLabel.setAlpha(0);

        const scoreText = this.add.text(width / 2, height / 2 - 30, `${finalScore}`, {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '48px',
            color: '#ffcc00',
            fontStyle: 'bold',
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#ffcc00',
                blur: 15,
                fill: true,
            },
        });
        scoreText.setOrigin(0.5);
        scoreText.setAlpha(0);

        this.tweens.add({
            targets: [nameLabel, scoreLabel, scoreText],
            alpha: 1,
            duration: 600,
            delay: 400,
            ease: 'Power2',
        });

        // === Leaderboard ===
        const topScores = ScoreManager.getTopScores(5);
        const lbStartY = height / 2 + 20;

        const lbTitle = this.add.text(width / 2, lbStartY, '🏆  TOP SCORES', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#6688aa',
            letterSpacing: 3,
        });
        lbTitle.setOrigin(0.5);
        lbTitle.setAlpha(0);

        const lbEntries: Phaser.GameObjects.Text[] = [lbTitle];

        topScores.forEach((entry, index) => {
            const isCurrentRun = entry.username === username && entry.score === finalScore;
            const color = isCurrentRun ? '#ffcc00' : '#88aacc';
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';

            const entryText = this.add.text(
                width / 2,
                lbStartY + 28 + index * 24,
                `${medal} ${entry.username.padEnd(12)} ${String(entry.score).padStart(6)}`,
                {
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color,
                }
            );
            entryText.setOrigin(0.5);
            entryText.setAlpha(0);
            lbEntries.push(entryText);
        });

        this.tweens.add({
            targets: lbEntries,
            alpha: 1,
            duration: 500,
            delay: 600,
            ease: 'Power2',
        });

        // === Restart button ===
        const btnX = width / 2 - 110;
        const btnY = lbStartY + 28 + Math.max(topScores.length, 1) * 24 + 20;
        const btnW = 220;
        const btnH = 52;

        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(0xff4466, 0.15);
        buttonBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
        buttonBg.lineStyle(2, 0xff4466, 0.6);
        buttonBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);
        buttonBg.setAlpha(0);

        const restartText = this.add.text(width / 2, btnY + btnH / 2, '🔄  RESTART', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '22px',
            color: '#ff6688',
            fontStyle: 'bold',
        });
        restartText.setOrigin(0.5);
        restartText.setAlpha(0);

        this.tweens.add({
            targets: [buttonBg, restartText],
            alpha: 1,
            duration: 500,
            delay: 800,
            ease: 'Power2',
        });

        const hitZone = this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
            .setInteractive({ useHandCursor: true });

        hitZone.on('pointerover', () => {
            buttonBg.clear();
            buttonBg.fillStyle(0xff4466, 0.35);
            buttonBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
            buttonBg.lineStyle(2, 0xff6688, 1);
            buttonBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);
            restartText.setColor('#ffffff');
        });

        hitZone.on('pointerout', () => {
            buttonBg.clear();
            buttonBg.fillStyle(0xff4466, 0.15);
            buttonBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
            buttonBg.lineStyle(2, 0xff4466, 0.6);
            buttonBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);
            restartText.setColor('#ff6688');
        });

        hitZone.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('GameScene');
            });
        });

        // Menu button
        const menuBtnY = btnY + 70;
        const menuText = this.add.text(width / 2, menuBtnY, 'MAIN MENU', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#556677',
        });
        menuText.setOrigin(0.5);
        menuText.setAlpha(0);
        menuText.setInteractive({ useHandCursor: true });

        this.tweens.add({
            targets: menuText,
            alpha: 1,
            duration: 500,
            delay: 1000,
        });

        menuText.on('pointerover', () => menuText.setColor('#aabbcc'));
        menuText.on('pointerout', () => menuText.setColor('#556677'));
        menuText.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('MenuScene');
            });
        });

        // Fade in
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }
}
