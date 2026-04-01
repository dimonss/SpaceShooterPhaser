import Phaser from 'phaser';
import { MobileControls } from '../utils/MobileControls';
import { BaseScene } from './BaseScene';

export class GameScene extends BaseScene {
    private player!: Phaser.Physics.Arcade.Image;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private bullets!: Phaser.Physics.Arcade.Group;
    private asteroids!: Phaser.Physics.Arcade.Group;
    private powerups!: Phaser.Physics.Arcade.Group;
    private scoreText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private ammoLabel!: Phaser.GameObjects.Text;
    private ammoBarBg!: Phaser.GameObjects.Rectangle;
    private ammoBarGlow!: Phaser.GameObjects.Rectangle;
    private ammoBarFill!: Phaser.GameObjects.Rectangle;
    private ammoBarTween?: Phaser.Tweens.Tween;
    private ammoPulseTween?: Phaser.Tweens.Tween;
    private lowAmmoTween?: Phaser.Tweens.Tween;
    private score = 0;
    private lives = 3;
    private maxBullets = 10;
    private currentBullets = 10;
    private lastFired = 0;
    private fireRate = 180;
    private asteroidTimer!: Phaser.Time.TimerEvent;
    private difficulty = 1;

    private isInvulnerable = false;
    private isGameOver = false;
    private stars: Phaser.GameObjects.Image[] = [];
    private engineParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
    private mobileControls!: MobileControls;

    // Pause
    private escKey!: Phaser.Input.Keyboard.Key;
    private isPaused = false;
    private pauseOverlay!: Phaser.GameObjects.Rectangle;
    private pauseText!: Phaser.GameObjects.Text;
    private pauseBtn!: Phaser.GameObjects.Text;
    private readonly ammoBarWidth = 180;

    constructor() {
        super({ key: 'GameScene' });
    }

    create(): void {
        const { width, height } = this.cameras.main;
        this.score = 0;
        this.lives = 3;
        this.currentBullets = this.maxBullets;
        this.difficulty = 1;
        this.isInvulnerable = false;
        this.isGameOver = false;

        // === Scrolling starfield ===
        this.stars = [];
        for (let i = 0; i < 80; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const star = this.add.image(x, y, 'star');
            const scale = Phaser.Math.FloatBetween(0.2, 1);
            star.setAlpha(scale * 0.6);
            star.setScale(scale);
            star.setData('speed', scale * 40 + 10);
            this.stars.push(star);
        }

        // === Groups ===
        this.bullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 30,
        });

        this.asteroids = this.physics.add.group();
        this.powerups = this.physics.add.group();

        // === Player ===
        this.player = this.physics.add.image(width / 2, height - 80, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setScale(0.9);
        this.player.setDepth(10);

        // Engine particles
        this.engineParticles = this.add.particles(0, 0, 'particle', {
            speed: { min: 20, max: 60 },
            angle: { min: 80, max: 100 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 400,
            blendMode: Phaser.BlendModes.ADD,
            frequency: 30,
            tint: [0xff6600, 0xff3300, 0xffaa00],
        });
        this.engineParticles.startFollow(this.player, 0, 24);
        this.engineParticles.setDepth(9);

        // === Input ===
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // === Mobile controls ===
        this.mobileControls = new MobileControls();

        // === UI ===
        this.scoreText = this.add.text(20, 16, 'SCORE: 0', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#00ccff',
            shadow: { offsetX: 0, offsetY: 0, color: '#00ccff', blur: 10, fill: true },
        });
        this.scoreText.setDepth(20);

        this.livesText = this.add.text(width - 20, 16, '❤️ ❤️ ❤️', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#ff4466',
        });
        this.livesText.setOrigin(1, 0);
        this.livesText.setDepth(20);

        this.ammoLabel = this.add.text(20, 44, 'AMMO', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#8cefff',
            shadow: { offsetX: 0, offsetY: 0, color: '#00c8ff', blur: 8, fill: true },
        });
        this.ammoLabel.setDepth(20);

        this.ammoBarBg = this.add.rectangle(20, 70, this.ammoBarWidth, 14, 0x001018, 0.9);
        this.ammoBarBg.setOrigin(0, 0.5);
        this.ammoBarBg.setStrokeStyle(2, 0x2a4f66, 1);
        this.ammoBarBg.setDepth(20);

        this.ammoBarGlow = this.add.rectangle(20, 70, this.ammoBarWidth, 14, 0x00e5ff, 0.25);
        this.ammoBarGlow.setOrigin(0, 0.5);
        this.ammoBarGlow.setDepth(21);

        this.ammoBarFill = this.add.rectangle(20, 70, this.ammoBarWidth, 14, 0x00e5ff, 1);
        this.ammoBarFill.setOrigin(0, 0.5);
        this.ammoBarFill.setDepth(22);

        this.updateBulletsDisplay(true);

        // === Spawn timers ===
        this.asteroidTimer = this.time.addEvent({
            delay: 800,
            callback: this.spawnAsteroid,
            callbackScope: this,
            loop: true,
        });

        // Bullet restore timer
        this.time.addEvent({
            delay: 500,
            callback: () => {
                if (this.isGameOver) return;
                if (this.currentBullets < this.maxBullets) {
                    this.currentBullets++;
                    this.updateBulletsDisplay();
                }
            },
            callbackScope: this,
            loop: true,
        });

        // Power-up timer (rare, with randomness)
        this.time.addEvent({
            delay: 24000,
            callback: () => {
                // 50% chance to actually spawn
                if (Math.random() < 0.5) {
                    this.spawnPowerup();
                }
            },
            callbackScope: this,
            loop: true,
        });

        // Difficulty ramp
        this.time.addEvent({
            delay: 5000,
            callback: () => {
                this.difficulty += 0.2;
                // Speed up asteroid spawning
                const newDelay = Math.max(200, 800 - this.difficulty * 50);
                this.asteroidTimer.reset({
                    delay: newDelay,
                    callback: this.spawnAsteroid,
                    callbackScope: this,
                    loop: true,
                });
            },
            callbackScope: this,
            loop: true,
        });

        // === Collisions ===
        this.physics.add.overlap(
            this.bullets,
            this.asteroids,
            this.bulletHitAsteroid as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        this.physics.add.overlap(
            this.player,
            this.asteroids,
            this.playerHitAsteroid as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        this.physics.add.overlap(
            this.player,
            this.powerups,
            this.collectPowerup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        // === Pause (ESC key) ===
        this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.escKey.on('down', () => this.togglePause());

        // Pause overlay (hidden initially)
        this.pauseOverlay = this.add.rectangle(
            width / 2, height / 2, width, height, 0x000000, 0.6
        );
        this.pauseOverlay.setDepth(50);
        this.pauseOverlay.setVisible(false);
        this.pauseOverlay.setInteractive();
        this.pauseOverlay.on('pointerdown', () => this.togglePause());

        this.pauseText = this.add.text(width / 2, height / 2 - 20, '⏸  PAUSED', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 0, color: '#00ccff', blur: 20, fill: true },
        });
        this.pauseText.setOrigin(0.5);
        this.pauseText.setDepth(51);
        this.pauseText.setVisible(false);

        // Pause button (visible for mobile, small on desktop)
        this.pauseBtn = this.add.text(width / 2, 16, '⏸', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#aaddff',
        });
        this.pauseBtn.setOrigin(0.5, 0);
        this.pauseBtn.setDepth(20);
        this.pauseBtn.setInteractive({ useHandCursor: true });
        this.pauseBtn.on('pointerdown', () => this.togglePause());

        this.isPaused = false;

        // Fade in
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    update(time: number): void {
        if (this.isPaused || this.isGameOver) return;

        const speed = 300;
        const touch = this.mobileControls.input;

        // === Player movement (keyboard + touch) ===
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown) {
            vx = -speed;
        } else if (this.cursors.right.isDown) {
            vx = speed;
        }

        if (this.cursors.up.isDown) {
            vy = -speed;
        } else if (this.cursors.down.isDown) {
            vy = speed;
        }

        // Mobile joystick overrides if active
        if (Math.abs(touch.x) > 0.15 || Math.abs(touch.y) > 0.15) {
            vx = touch.x * speed;
            vy = touch.y * speed;
        }

        this.player.setVelocityX(vx);
        this.player.setVelocityY(vy);

        // === Shooting (keyboard + touch) ===
        const wantFire = this.spaceKey.isDown || touch.fire;
        if (wantFire && time > this.lastFired + this.fireRate) {
            if (this.currentBullets > 0) {
                this.currentBullets--;
                this.updateBulletsDisplay();
                this.fireBullet();
                this.lastFired = time;
            }
        }

        // === Scrolling stars ===
        for (const star of this.stars) {
            const spd = star.getData('speed') as number;
            star.y += spd * (1 / 60);
            if (star.y > this.cameras.main.height + 10) {
                star.y = -10;
                star.x = Phaser.Math.Between(0, this.cameras.main.width);
            }
        }

        // === Cleanup off-screen objects ===
        this.bullets.getChildren().forEach((bullet) => {
            const b = bullet as Phaser.Physics.Arcade.Image;
            if (b.active && b.y < -20) {
                b.setActive(false);
                b.setVisible(false);
                (b.body as Phaser.Physics.Arcade.Body).stop();
                (b.body as Phaser.Physics.Arcade.Body).enable = false;
            }
        });

        this.asteroids.getChildren().forEach((asteroid) => {
            const a = asteroid as Phaser.Physics.Arcade.Image;
            if (a.active && a.y > this.cameras.main.height + 60) {
                a.destroy();
            }
        });

        this.powerups.getChildren().forEach((powerup) => {
            const p = powerup as Phaser.Physics.Arcade.Image;
            if (p.active && p.y > this.cameras.main.height + 60) {
                p.destroy();
            }
        });
    }

    private fireBullet(): void {
        const bullet = this.bullets.get(
            this.player.x,
            this.player.y - 20,
            'bullet'
        ) as Phaser.Physics.Arcade.Image;

        if (!bullet) return;

        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.setScale(1);
        (bullet.body as Phaser.Physics.Arcade.Body).reset(this.player.x, this.player.y - 20);
        (bullet.body as Phaser.Physics.Arcade.Body).enable = true;
        bullet.setVelocityY(-500);
        bullet.setBlendMode(Phaser.BlendModes.ADD);
        bullet.setDepth(8);
    }

    private spawnAsteroid(): void {
        const { width } = this.cameras.main;
        const x = Phaser.Math.Between(40, width - 40);
        const variant = Phaser.Math.Between(0, 2);
        const asteroid = this.asteroids.create(x, -40, `asteroid${variant}`) as Phaser.Physics.Arcade.Image;

        if (!asteroid) return;

        const speedY = Phaser.Math.Between(80, 150) * this.difficulty;
        const speedX = Phaser.Math.Between(-40, 40);
        asteroid.setVelocity(speedX, speedY);
        asteroid.setAngularVelocity(Phaser.Math.Between(-120, 120));
        
        const scale = Phaser.Math.FloatBetween(0.7, 1.4);
        asteroid.setScale(scale);
        
        if (scale >= 1.1) {
            asteroid.setData('hp', 1);
            asteroid.setData('isLarge', true);
        } else {
            asteroid.setData('hp', 1);
            asteroid.setData('isLarge', false);
        }
    }

    private spawnPowerup(): void {
        const { width } = this.cameras.main;
        const x = Phaser.Math.Between(40, width - 40);
        const powerup = this.powerups.create(x, -30, 'powerup') as Phaser.Physics.Arcade.Image;
        if (!powerup) return;
        powerup.setVelocityY(100);
        powerup.setBlendMode(Phaser.BlendModes.ADD);

        // Pulsing animation
        this.tweens.add({
            targets: powerup,
            scale: 1.3,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    private bulletHitAsteroid(
        bulletObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
        asteroidObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
    ): void {
        const bullet = bulletObj as Phaser.Physics.Arcade.Image;
        const asteroid = asteroidObj as Phaser.Physics.Arcade.Image;

        if (!bullet.active || !asteroid.active) return;

        bullet.setActive(false);
        bullet.setVisible(false);
        (bullet.body as Phaser.Physics.Arcade.Body).stop();
        (bullet.body as Phaser.Physics.Arcade.Body).enable = false;

        let hp = asteroid.getData('hp') as number;
        hp = (hp || 1) - 1;
        
        if (hp > 0) {
            asteroid.setData('hp', hp);
            
            // Visual hit feedback
            this.tweens.add({
                targets: asteroid,
                alpha: 0.5,
                duration: 50,
                yoyo: true,
                onComplete: () => { asteroid.setAlpha(1); }
            });
            return;
        }

        const isLarge = asteroid.getData('isLarge') as boolean;
        if (isLarge) {
            this.spawnSmallAsteroids(asteroid.x, asteroid.y);
        }

        // Explosion
        this.createExplosion(asteroid.x, asteroid.y);

        asteroid.destroy();

        // Score
        this.score += 10;
        this.scoreText.setText(`SCORE: ${this.score}`);

        // Score pop-up
        const pop = this.add.text(asteroid.x, asteroid.y, '+10', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffcc00',
            shadow: { offsetX: 0, offsetY: 0, color: '#ffcc00', blur: 8, fill: true },
        });
        pop.setOrigin(0.5);
        pop.setDepth(20);
        this.tweens.add({
            targets: pop,
            y: pop.y - 40,
            alpha: 0,
            duration: 700,
            ease: 'Power2',
            onComplete: () => pop.destroy(),
        });
    }

    private spawnSmallAsteroids(x: number, y: number): void {
        for (let i = 0; i < 2; i++) {
            const variant = Phaser.Math.Between(0, 2);
            const asteroid = this.asteroids.create(x, y, `asteroid${variant}`) as Phaser.Physics.Arcade.Image;

            if (!asteroid) continue;

            const speedY = Phaser.Math.Between(80, 150) * this.difficulty;
            const speedX = i === 0 ? Phaser.Math.Between(-120, -40) : Phaser.Math.Between(40, 120);
            asteroid.setVelocity(speedX, speedY);
            asteroid.setAngularVelocity(Phaser.Math.Between(-200, 200));
            asteroid.setScale(Phaser.Math.FloatBetween(0.5, 0.8));
            asteroid.setData('hp', 1);
            asteroid.setData('isLarge', false);
        }
    }

    private playerHitAsteroid(
        _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
        asteroidObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
    ): void {
        if (this.isInvulnerable || this.isGameOver) return;

        const asteroid = asteroidObj as Phaser.Physics.Arcade.Image;
        if (!asteroid.active) return;

        this.createExplosion(asteroid.x, asteroid.y);
        asteroid.destroy();

        this.lives--;
        this.updateLivesDisplay();

        if (this.lives <= 0) {
            this.gameOver();
            return;
        }

        // Invulnerability frames
        this.isInvulnerable = true;
        this.tweens.add({
            targets: this.player,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 10,
            onComplete: () => {
                this.player.setAlpha(1);
                this.isInvulnerable = false;
            },
        });

        // Camera shake
        this.cameras.main.shake(200, 0.01);
    }

    private collectPowerup(
        _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
        powerupObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
    ): void {
        const powerup = powerupObj as Phaser.Physics.Arcade.Image;
        powerup.destroy();

        // Restore a life (max 3)
        if (this.lives < 3) {
            this.lives++;
            this.updateLivesDisplay();
        }

        // Bonus score
        this.score += 25;
        this.scoreText.setText(`SCORE: ${this.score}`);

        // Pop-up
        const pop = this.add.text(this.player.x, this.player.y - 30, '+❤️', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#00ff88',
        });
        pop.setOrigin(0.5);
        pop.setDepth(20);
        this.tweens.add({
            targets: pop,
            y: pop.y - 50,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => pop.destroy(),
        });

        // Flash
        this.cameras.main.flash(200, 0, 255, 100);
    }

    private createExplosion(x: number, y: number): void {
        const particles = this.add.particles(x, y, 'particle', {
            speed: { min: 50, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 500,
            blendMode: Phaser.BlendModes.ADD,
            quantity: 15,
            tint: [0xff6600, 0xff3300, 0xffcc00, 0xffffff],
        });
        particles.setDepth(15);

        this.time.delayedCall(600, () => {
            particles.destroy();
        });
    }

    private updateLivesDisplay(): void {
        const hearts = Array(this.lives).fill('❤️').join(' ');
        this.livesText.setText(hearts);
    }

    private updateBulletsDisplay(instant = false): void {
        const ratio = Phaser.Math.Clamp(this.currentBullets / this.maxBullets, 0, 1);
        const fillWidth = Math.max(0, this.ammoBarWidth * ratio);

        let barColor = 0x00e5ff;
        if (ratio <= 0.3) {
            barColor = 0xff4d57;
        } else if (ratio <= 0.6) {
            barColor = 0xffc247;
        }

        if (this.ammoBarTween) {
            this.ammoBarTween.stop();
            this.ammoBarTween = undefined;
        }

        if (instant) {
            this.ammoBarFill.width = fillWidth;
            this.ammoBarGlow.width = fillWidth;
        } else {
            const tweenState = { width: this.ammoBarFill.width };
            this.ammoBarTween = this.tweens.add({
                targets: tweenState,
                width: fillWidth,
                duration: 220,
                ease: 'Sine.easeOut',
                onUpdate: () => {
                    this.ammoBarFill.width = tweenState.width;
                    this.ammoBarGlow.width = tweenState.width;
                },
            });
        }

        this.ammoBarFill.setFillStyle(barColor, 1);
        this.ammoBarGlow.setFillStyle(barColor, 0.3);

        if (this.ammoPulseTween) {
            this.ammoPulseTween.stop();
            this.ammoPulseTween = undefined;
        }
        this.ammoBarFill.setScale(1, 1);
        this.ammoBarGlow.setScale(1, 1);
        this.ammoPulseTween = this.tweens.add({
            targets: [this.ammoBarFill, this.ammoBarGlow],
            scaleY: 1.18,
            duration: 80,
            yoyo: true,
            ease: 'Sine.easeOut',
        });

        if (ratio <= 0.3 && ratio > 0) {
            if (!this.lowAmmoTween || !this.lowAmmoTween.isPlaying()) {
                this.lowAmmoTween = this.tweens.add({
                    targets: this.ammoBarGlow,
                    alpha: { from: 0.2, to: 0.7 },
                    duration: 350,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }
        } else if (this.lowAmmoTween) {
            this.lowAmmoTween.stop();
            this.lowAmmoTween = undefined;
            this.ammoBarGlow.setAlpha(0.3);
        }

        if (ratio === 0) {
            this.ammoLabel.setText('AMMO RECHARGING');
            this.ammoLabel.setColor('#ff7d85');
        } else {
            this.ammoLabel.setText('AMMO');
            this.ammoLabel.setColor('#8cefff');
        }
    }

    private togglePause(): void {
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.physics.pause();
            this.tweens.pauseAll();
            this.time.paused = true;
            this.pauseOverlay.setVisible(true);
            this.pauseText.setVisible(true);
            this.pauseBtn.setText('▶');
        } else {
            this.physics.resume();
            this.tweens.resumeAll();
            this.time.paused = false;
            this.pauseOverlay.setVisible(false);
            this.pauseText.setVisible(false);
            this.pauseBtn.setText('⏸');
        }
    }

    private gameOver(): void {
        if (this.isGameOver) return;
        this.isGameOver = true;

        // Explosion on player
        this.createExplosion(this.player.x, this.player.y);
        this.player.setVisible(false);
        this.player.setActive(false);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.stop();
        body.enable = false;
        this.engineParticles.stop();
        this.mobileControls.destroy();

        this.cameras.main.shake(400, 0.02);

        this.time.delayedCall(1000, () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                const username = this.registry.get('username') || 'PILOT';
                this.launchScene(
                    'GameOverScene',
                    () => import('./GameOverScene').then((m) => m.GameOverScene),
                    { score: this.score, username },
                );
            });
        });
    }
}
