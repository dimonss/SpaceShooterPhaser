import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Image;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private bullets!: Phaser.Physics.Arcade.Group;
    private asteroids!: Phaser.Physics.Arcade.Group;
    private powerups!: Phaser.Physics.Arcade.Group;
    private scoreText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private score = 0;
    private lives = 3;
    private lastFired = 0;
    private fireRate = 180;
    private asteroidTimer!: Phaser.Time.TimerEvent;
    private difficulty = 1;
    private difficultyTimer!: Phaser.Time.TimerEvent;
    private isInvulnerable = false;
    private stars: Phaser.GameObjects.Image[] = [];
    private engineParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor() {
        super({ key: 'GameScene' });
    }

    create(): void {
        const { width, height } = this.cameras.main;
        this.score = 0;
        this.lives = 3;
        this.difficulty = 1;
        this.isInvulnerable = false;

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

        // === Spawn timers ===
        this.asteroidTimer = this.time.addEvent({
            delay: 800,
            callback: this.spawnAsteroid,
            callbackScope: this,
            loop: true,
        });

        // Power-up timer
        this.time.addEvent({
            delay: 8000,
            callback: this.spawnPowerup,
            callbackScope: this,
            loop: true,
        });

        // Difficulty ramp
        this.difficultyTimer = this.time.addEvent({
            delay: 5000,
            callback: () => {
                this.difficulty += 0.2;
                // Speed up asteroid spawning
                const newDelay = Math.max(200, 800 - this.difficulty * 50);
                this.asteroidTimer.delay = newDelay;
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

        // Fade in
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    update(time: number): void {
        const speed = 300;

        // === Player movement ===
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
        } else {
            this.player.setVelocityY(0);
        }

        // === Shooting ===
        if (this.spaceKey.isDown && time > this.lastFired + this.fireRate) {
            this.fireBullet();
            this.lastFired = time;
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
            }
        });

        this.asteroids.getChildren().forEach((asteroid) => {
            const a = asteroid as Phaser.Physics.Arcade.Image;
            if (a.active && a.y > this.cameras.main.height + 60) {
                a.destroy();
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
        asteroid.setScale(Phaser.Math.FloatBetween(0.7, 1.4));
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

        bullet.setActive(false);
        bullet.setVisible(false);
        (bullet.body as Phaser.Physics.Arcade.Body).stop();

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

    private playerHitAsteroid(
        playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
        asteroidObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
    ): void {
        if (this.isInvulnerable) return;

        const asteroid = asteroidObj as Phaser.Physics.Arcade.Image;
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

        // Restore a life (max 5)
        if (this.lives < 5) {
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

    private gameOver(): void {
        // Explosion on player
        this.createExplosion(this.player.x, this.player.y);
        this.player.setVisible(false);
        this.player.setActive(false);
        (this.player.body as Phaser.Physics.Arcade.Body).stop();
        this.engineParticles.stop();

        this.cameras.main.shake(400, 0.02);

        this.time.delayedCall(1000, () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('GameOverScene', { score: this.score });
            });
        });
    }
}
