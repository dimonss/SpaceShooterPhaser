

export interface MobileInput {
    x: number;   // -1 to 1
    y: number;   // -1 to 1
    fire: boolean;
}

/**
 * Renders a virtual joystick (left) and fire button (right)
 * as DOM overlays on top of the Phaser canvas.
 * Only visible on touch-capable devices.
 */
export class MobileControls {
    private container!: HTMLDivElement;
    private joystickBase!: HTMLDivElement;
    private joystickThumb!: HTMLDivElement;
    private fireBtn!: HTMLDivElement;

    private inputState: MobileInput = { x: 0, y: 0, fire: false };
    private joystickActive = false;
    private joystickPointerId: number | null = null;
    private baseX = 0;
    private baseY = 0;
    private maxRadius = 50;

    public readonly isTouchDevice: boolean;

    constructor() {
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (this.isTouchDevice) {
            this.createDOM();
        }
    }

    get input(): MobileInput {
        return this.inputState;
    }

    private createDOM(): void {
        // Container overlay
        this.container = document.createElement('div');
        this.container.id = 'mobile-controls';
        Object.assign(this.container.style, {
            position: 'fixed',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '1000',
            touchAction: 'none',
        });

        // ===== Joystick =====
        this.joystickBase = document.createElement('div');
        Object.assign(this.joystickBase.style, {
            position: 'absolute',
            left: '30px',
            bottom: '30px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '2px solid rgba(0,204,255,0.3)',
            pointerEvents: 'auto',
            touchAction: 'none',
        });

        this.joystickThumb = document.createElement('div');
        Object.assign(this.joystickThumb.style, {
            position: 'absolute',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,204,255,0.6) 0%, rgba(0,100,200,0.3) 100%)',
            border: '2px solid rgba(0,204,255,0.5)',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            transition: 'none',
            pointerEvents: 'none',
        });

        this.joystickBase.appendChild(this.joystickThumb);
        this.container.appendChild(this.joystickBase);

        // ===== Fire Button =====
        this.fireBtn = document.createElement('div');
        Object.assign(this.fireBtn.style, {
            position: 'absolute',
            right: '30px',
            bottom: '45px',
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,60,60,0.4) 0%, rgba(200,30,30,0.15) 100%)',
            border: '2px solid rgba(255,80,80,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: 'rgba(255,120,120,0.9)',
            fontWeight: 'bold',
            letterSpacing: '1px',
            pointerEvents: 'auto',
            touchAction: 'none',
            userSelect: 'none',
            webkitUserSelect: 'none',
        } as Partial<CSSStyleDeclaration>);
        this.fireBtn.textContent = 'FIRE';
        this.container.appendChild(this.fireBtn);

        document.body.appendChild(this.container);

        this.bindEvents();
    }

    private bindEvents(): void {
        // ----- Joystick -----
        this.joystickBase.addEventListener('touchstart', (e: TouchEvent) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.joystickActive = true;
            this.joystickPointerId = touch.identifier;
            const rect = this.joystickBase.getBoundingClientRect();
            this.baseX = rect.left + rect.width / 2;
            this.baseY = rect.top + rect.height / 2;
            this.handleJoystickMove(touch.clientX, touch.clientY);
        }, { passive: false });

        document.addEventListener('touchmove', (e: TouchEvent) => {
            if (!this.joystickActive) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.joystickPointerId) {
                    e.preventDefault();
                    this.handleJoystickMove(touch.clientX, touch.clientY);
                    break;
                }
            }
        }, { passive: false });

        const endJoystick = (e: TouchEvent) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.joystickPointerId) {
                    this.joystickActive = false;
                    this.joystickPointerId = null;
                    this.inputState.x = 0;
                    this.inputState.y = 0;
                    this.joystickThumb.style.transform = 'translate(-50%, -50%)';
                    break;
                }
            }
        };
        document.addEventListener('touchend', endJoystick);
        document.addEventListener('touchcancel', endJoystick);

        // ----- Fire Button -----
        this.fireBtn.addEventListener('touchstart', (e: TouchEvent) => {
            e.preventDefault();
            this.inputState.fire = true;
            this.fireBtn.style.background = 'radial-gradient(circle, rgba(255,100,100,0.7) 0%, rgba(255,50,50,0.3) 100%)';
            this.fireBtn.style.transform = 'scale(0.92)';
        }, { passive: false });

        const endFire = (e: TouchEvent) => {
            // Only release if none of the remaining touches are on the fire button
            let stillOnBtn = false;
            for (let i = 0; i < e.touches.length; i++) {
                const t = e.touches[i];
                const rect = this.fireBtn.getBoundingClientRect();
                if (t.clientX >= rect.left && t.clientX <= rect.right &&
                    t.clientY >= rect.top && t.clientY <= rect.bottom) {
                    stillOnBtn = true;
                    break;
                }
            }
            if (!stillOnBtn) {
                this.inputState.fire = false;
                this.fireBtn.style.background = 'radial-gradient(circle, rgba(255,60,60,0.4) 0%, rgba(200,30,30,0.15) 100%)';
                this.fireBtn.style.transform = 'scale(1)';
            }
        };
        this.fireBtn.addEventListener('touchend', endFire, { passive: false });
        this.fireBtn.addEventListener('touchcancel', endFire, { passive: false });
    }

    private handleJoystickMove(clientX: number, clientY: number): void {
        let dx = clientX - this.baseX;
        let dy = clientY - this.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.maxRadius) {
            dx = (dx / dist) * this.maxRadius;
            dy = (dy / dist) * this.maxRadius;
        }

        this.inputState.x = dx / this.maxRadius;
        this.inputState.y = dy / this.maxRadius;

        const thumbOffsetX = dx;
        const thumbOffsetY = dy;
        this.joystickThumb.style.transform =
            `translate(calc(-50% + ${thumbOffsetX}px), calc(-50% + ${thumbOffsetY}px))`;
    }

    destroy(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
