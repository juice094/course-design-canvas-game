/**
 * main.js — 游戏主入口
 *
 * 负责：状态机、requestAnimationFrame循环、菜单/暂停/结束画面。
 * 游戏世界逻辑委托给 GameEngine。
 */

const GameState = {
    MENU:     0,
    PLAYING:  1,
    SHOP:     2,
    PAUSED:   3,
    GAMEOVER: 4
};

class Game {
    constructor() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            throw new Error('Canvas element #gameCanvas not found');
        }
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.input = new InputManager();
        this.engine = new GameEngine(canvas);
        this.state = GameState.MENU;

        this.lastTime = 0;
        this._boundLoop = this.loop.bind(this);
    }

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame(this._boundLoop);
    }

    loop(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();
        this.input.update();

        requestAnimationFrame(this._boundLoop);
    }

    update(dt) {
        switch (this.state) {
            case GameState.MENU:
                this._updateMenu();
                break;
            case GameState.PLAYING:
                this._updatePlaying(dt);
                break;
            case GameState.SHOP:
                this._updateShop(dt);
                break;
            case GameState.PAUSED:
                this._updatePaused();
                break;
            case GameState.GAMEOVER:
                this._updateGameOver();
                break;
        }
    }

    draw() {
        // 游戏世界由 engine 绘制
        if (this.state === GameState.PLAYING || this.state === GameState.PAUSED) {
            this.engine.draw(this.ctx);
        } else {
            // 菜单/结束状态：纯色背景
            this.ctx.fillStyle = '#1a1a2e';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // 叠加UI层
        switch (this.state) {
            case GameState.MENU:
                this._drawMenu();
                break;
            case GameState.SHOP:
                // 商店画面由 engine 绘制
                break;
            case GameState.PAUSED:
                this._drawPauseOverlay();
                break;
            case GameState.GAMEOVER:
                this._drawGameOver();
                break;
        }

        // PLAYING状态下绘制HUD
        if (this.state === GameState.PLAYING || this.state === GameState.PAUSED) {
            this._drawHUD();
        }
    }

    // ---------- 菜单 ----------

    _updateMenu() {
        if (this.input.isPressed(GameAction.CONFIRM) || this.input.isPressed(GameAction.USE_POWERUP)) {
            this.engine.reset();
            this.changeState(GameState.PLAYING);
        }
    }

    _drawMenu() {
        const ctx = this.ctx;
        const cx = this.width / 2;
        const cy = this.height / 2;

        ctx.fillStyle = '#FFE082';
        ctx.font = 'bold 48px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PRAIRIE KING LITE', cx, cy - 80);

        ctx.fillStyle = '#aaa';
        ctx.font = '20px "Courier New", monospace';
        ctx.fillText('草原王者大冒险', cx, cy - 30);

        ctx.fillStyle = '#ccc';
        ctx.font = '16px "Courier New", monospace';
        ctx.fillText('WASD 移动    方向键 射击', cx, cy + 30);
        ctx.fillText('Z / Space 使用道具    ESC / P 暂停', cx, cy + 55);

        const blink = Math.sin(performance.now() / 300) > 0;
        if (blink) {
            ctx.fillStyle = '#4CAF50';
            ctx.font = 'bold 20px "Courier New", monospace';
            ctx.fillText('按 SPACE 开始游戏', cx, cy + 120);
        }
    }

    // ---------- 游戏 ----------

    _updatePlaying(dt) {
        if (this.input.isPressed(GameAction.PAUSE)) {
            this.changeState(GameState.PAUSED);
            return;
        }

        if (this.input.isPressed(GameAction.RESTART)) {
            this.engine.reset();
            return;
        }

        this.engine.update(dt, this.input);

        if (this.engine.isInShop) {
            this.changeState(GameState.SHOP);
            return;
        }

        if (this.engine.isGameOver) {
            this.changeState(GameState.GAMEOVER);
        }
    }

    // ---------- 商店 ----------

    _updateShop(dt) {
        this.engine.update(dt, this.input);
        if (!this.engine.isInShop) {
            this.changeState(GameState.PLAYING);
        }
    }

    // ---------- 暂停 ----------

    _updatePaused() {
        if (this.input.isPressed(GameAction.PAUSE)) {
            this.changeState(GameState.PLAYING);
            return;
        }
        if (this.input.isPressed(GameAction.RESTART)) {
            this.engine.reset();
            this.changeState(GameState.PLAYING);
        }
    }

    _drawPauseOverlay() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, this.width, this.height);

        const cx = this.width / 2;
        const cy = this.height / 2;
        ctx.fillStyle = '#FFE082';
        ctx.font = 'bold 36px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', cx, cy - 20);

        ctx.fillStyle = '#ccc';
        ctx.font = '16px "Courier New", monospace';
        ctx.fillText('按 ESC 或 P 继续', cx, cy + 30);
    }

    // ---------- 结束 ----------

    _updateGameOver() {
        if (this.input.isPressed(GameAction.CONFIRM) || this.input.isPressed(GameAction.USE_POWERUP)) {
            this.changeState(GameState.MENU);
        }
    }

    _drawGameOver() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        const cx = this.width / 2;
        const cy = this.height / 2;
        ctx.fillStyle = '#F44336';
        ctx.font = 'bold 42px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', cx, cy - 50);

        ctx.fillStyle = '#FFE082';
        ctx.font = '24px "Courier New", monospace';
        ctx.fillText(`得分: ${this.engine.score}`, cx, cy + 10);
        ctx.fillText(`波次: ${this.engine.waveNum}`, cx, cy + 40);

        ctx.fillStyle = '#ccc';
        ctx.font = '18px "Courier New", monospace';
        ctx.fillText('按 SPACE 返回菜单', cx, cy + 90);
    }

    // ---------- HUD ----------

    _drawHUD() {
        const ctx = this.ctx;
        const p = this.engine.player;

        // 生命（心形图标）
        for (let i = 0; i < p.maxHealth; i++) {
            const hx = 16 + i * 28;
            const hy = 16;
            ctx.fillStyle = i < p.health ? '#F44336' : '#555';
            this._drawHeart(ctx, hx, hy, 12);
        }

        // 命数
        ctx.fillStyle = '#FFE082';
        ctx.font = '16px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`x${p.lives}`, 16 + p.maxHealth * 28 + 8, 16);

        // 金币
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`$${this.engine.coins}`, 16, 48);

        // 得分
        ctx.fillStyle = '#FFF';
        ctx.fillText(`SCORE ${this.engine.score}`, 16, 72);

        // 敌人数量
        ctx.fillStyle = '#F44336';
        ctx.fillText(`ENEMIES ${this.engine.enemies.length}`, 16, 96);

        // 波次 + 进度
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'right';
        const waveInfo = this.engine.waveManager.getWaveInfo();
        ctx.fillText(`WAVE ${waveInfo.waveNum}`, this.width - 16, 16);
        if (waveInfo.active) {
            ctx.fillStyle = '#AAA';
            ctx.font = '12px "Courier New", monospace';
            ctx.fillText(`${waveInfo.spawned}/${waveInfo.total}`, this.width - 16, 34);
        }

        // 道具计时器
        let py = 80;
        for (const [type, time] of p.powerups) {
            const sec = Math.ceil(time / 1000);
            ctx.fillStyle = '#4FC3F7';
            ctx.textAlign = 'left';
            ctx.fillText(`${type}: ${sec}s`, 16, py);
            py += 20;
        }
    }

    _drawHeart(ctx, x, y, size) {
        const s = size / 2;
        ctx.beginPath();
        ctx.moveTo(x, y + s / 2);
        ctx.bezierCurveTo(x, y, x - s, y, x - s, y + s / 2);
        ctx.bezierCurveTo(x - s, y + s, x, y + s * 1.5, x, y + s * 2);
        ctx.bezierCurveTo(x, y + s * 1.5, x + s, y + s, x + s, y + s / 2);
        ctx.bezierCurveTo(x + s, y, x, y, x, y + s / 2);
        ctx.fill();
    }

    // ---------- 通用 ----------

    changeState(newState) {
        this.state = newState;
    }
}

// 启动
const game = new Game();
game.start();
