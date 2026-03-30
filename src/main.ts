import Phaser from 'phaser';
import { LoginScene } from './scenes/LoginScene';

// Hide the HTML loader overlay with a fade-out once Phaser is ready.
function dismissHtmlLoader(): void {
  const loader = document.getElementById('html-loader');
  if (!loader) return;
  loader.classList.add('hide');
  loader.addEventListener('transitionend', () => loader.remove(), { once: true });
}

// Only LoginScene is loaded upfront — all other scenes are lazy-loaded
// by each scene itself right before transitioning to the next one.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#0b0b2a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [LoginScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: {
    createContainer: true,
  },
  callbacks: {
    postBoot: () => dismissHtmlLoader(),
  },
};

new Phaser.Game(config);
