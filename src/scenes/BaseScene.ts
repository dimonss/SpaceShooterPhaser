import Phaser from 'phaser';

type SceneConstructor = new (...args: unknown[]) => Phaser.Scene;

/**
 * BaseScene — base class for all game scenes.
 *
 * Provides a unified `launchScene()` helper that:
 *   - lazily imports the target scene chunk on first use
 *   - registers it in the Phaser scene registry (scene.add)
 *   - starts it
 *   - catches network / parse errors and shows an in-scene error message
 */
export abstract class BaseScene extends Phaser.Scene {
    /**
     * Lazily load a scene chunk, register it if needed, then start it.
     *
     * @param key      Phaser scene key (must match the scene's `super({ key })`)
     * @param loader   Arrow function returning `import('./SomeScene')` — Vite uses
     *                 the static string inside to split the chunk at build time.
     * @param data     Optional data passed to the target scene's `create()`
     */
    protected launchScene(
        key: string,
        loader: () => Promise<SceneConstructor>,
        data?: object,
    ): void {
        // Use .then/.catch — do NOT make this method async so callers remain
        // sync-compatible (Phaser lifecycle methods don't await return values).
        loader()
            .then((SceneClass) => {
                if (!this.scene.get(key)) {
                    this.scene.add(key, SceneClass, false);
                }
                this.scene.start(key, data);
            })
            .catch((err: unknown) => {
                console.error(`[BaseScene] Failed to load scene "${key}":`, err);
                this.showLoadError(key);
            });
    }

    /** Shows a non-blocking error text on screen when a scene chunk fails to load. */
    private showLoadError(key: string): void {
        const { width, height } = this.cameras.main;
        const msg = this.add.text(
            width / 2,
            height / 2,
            `⚠️ Failed to load "${key}".\nCheck your connection and try again.`,
            {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#ff4466',
                align: 'center',
                wordWrap: { width: width * 0.8 },
            },
        );
        msg.setOrigin(0.5).setDepth(999);
    }
}
