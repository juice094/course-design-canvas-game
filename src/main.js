/**
 * main.js — 游戏主入口
 *
 * 负责：状态机、requestAnimationFrame循环、菜单/暂停/结束画面。
 * 游戏世界逻辑委托给 GameEngine。
 */

const GameState = {
    MENU:        0,
    PLAYING:     1,
    SHOP:        2,
    PAUSED:      3,
    GAMEOVER:    4,
    LEVEL_SELECT: 5,
    LEVEL_CLEAR:  6,
    WIN:          7
};

const LEVELS = [
    { id: 1, name: '第一关 草原入口', startWave: 1, endWave: 3 },
    { id: 2, name: '第二关 森林深处', startWave: 4, endWave: 6 },
    { id: 3, name: '第三关 幽灵墓地', startWave: 7, endWave: 9 },
    { id: 4, name: '第四关 恶魔荒原', startWave: 10, endWave: 12 },
    { id: 5, name: '最终关 魔王城堡', startWave: 13, endWave: 15, isFinal: true }
];

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
        this.audioInitialized = false;

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
            case GameState.LEVEL_SELECT:
                this._updateLevelSelect();
                break;
            case GameState.LEVEL_CLEAR:
                this._updateLevelClear();
                break;
            case GameState.WIN:
                this._updateWin();
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
        if (this.state === GameState.PLAYING || this.state === GameState.PAUSED || this.state === GameState.SHOP || this.state === GameState.LEVEL_CLEAR || this.state === GameState.WIN) {
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
            case GameState.LEVEL_SELECT:
                this._drawLevelSelect();
                break;
            case GameState.PAUSED:
                this._drawPauseOverlay();
                break;
            case GameState.GAMEOVER:
                this._drawGameOver();
                break;
            case GameState.LEVEL_CLEAR:
                this._drawLevelClear();
                break;
            case GameState.WIN:
                this._drawWin();
                break;
        }

        // PLAYING/SHOP 状态下绘制HUD
        if (this.state === GameState.PLAYING || this.state === GameState.PAUSED || this.state === GameState.SHOP || this.state === GameState.LEVEL_CLEAR || this.state === GameState.WIN) {
            this._drawHUD();
        }
    }

    // ---------- 菜单 ----------

    _updateMenu() {
        // 1：从第1波开始，保留原来的无尽模式
        if (this.input.keysPressed.has('Digit1') || this.input.isPressed(GameAction.CONFIRM) || this.input.isPressed(GameAction.USE_POWERUP)) {
            this._startEndlessGame();
            return;
        }

        // 2：进入选关界面
        if (this.input.keysPressed.has('Digit2')) {
            this.changeState(GameState.LEVEL_SELECT);
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

        const s = this.engine.saveData;
        ctx.fillStyle = '#AAA';
        ctx.font = '12px "Courier New", monospace';
        ctx.fillText(`最高分: ${s.highScore}  最高波次: ${s.highestWave}  已通关: 第${s.highestClearedLevel || 0}关`, cx, cy + 85);

        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.fillText('1 / SPACE  从第1波开始', cx, cy + 120);

        ctx.fillStyle = '#4FC3F7';
        ctx.fillText('2  选择关卡', cx, cy + 150);
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

        if (this.engine.isLevelComplete) {
            if (!this.engine.levelMode.endless) {
                this.engine.updateSaveOnLevelComplete(this.engine.levelMode.levelId);
            }
            this.engine.audio.stopBGM();
            this.changeState(this.engine.hasWon ? GameState.WIN : GameState.LEVEL_CLEAR);
            return;
        }

        if (this.engine.isGameOver) {
            this.engine.updateSaveOnGameOver();
            this.engine.audio.stopBGM();
            this.changeState(GameState.GAMEOVER);
        }
    }

    // ---------- 商店 ----------

    _updateShop(dt) {
        this.engine.update(dt, this.input);
        if (this.engine.isLevelComplete) {
            if (!this.engine.levelMode.endless) {
                this.engine.updateSaveOnLevelComplete(this.engine.levelMode.levelId);
            }
            this.engine.audio.stopBGM();
            this.changeState(this.engine.hasWon ? GameState.WIN : GameState.LEVEL_CLEAR);
            return;
        }
        if (!this.engine.isInShop) {
            this.changeState(GameState.PLAYING);
        }
    }

    // ---------- 选关 ----------

    _startEndlessGame() {
        if (!this.audioInitialized) {
            this.engine.audio.init();
            this.audioInitialized = true;
        }
        this.engine.audio.resume();
        this.engine.reset({ endless: true, name: '无尽模式', startWave: 1 });
        this.engine.audio.startBGM();
        this.changeState(GameState.PLAYING);
    }

    _startLevel(level) {
        if (!this.audioInitialized) {
            this.engine.audio.init();
            this.audioInitialized = true;
        }
        this.engine.audio.resume();
        this.engine.reset({
            endless: false,
            name: level.name,
            startWave: level.startWave,
            endWave: level.endWave,
            isFinal: !!level.isFinal,
            levelId: level.id
        });
        this.engine.audio.startBGM();
        this.changeState(GameState.PLAYING);
    }

    _updateLevelSelect() {
        if (this.input.isPressed(GameAction.PAUSE)) {
            this.changeState(GameState.MENU);
            return;
        }

        for (let i = 0; i < LEVELS.length; i++) {
            if (this.input.keysPressed.has(`Digit${i + 1}`)) {
                const unlocked = this.engine.saveData.unlockedLevel || 1;
                if (LEVELS[i].id <= unlocked) {
                    this._startLevel(LEVELS[i]);
                }
                return;
            }
        }
    }

    _drawLevelSelect() {
        const ctx = this.ctx;
        const cx = this.width / 2;

        ctx.fillStyle = '#FFE082';
        ctx.font = 'bold 38px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('选择关卡', cx, 70);

        ctx.fillStyle = '#AAA';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText('每关包含 3 波敌人，通关最后一关后获得胜利', cx, 110);

        const unlocked = this.engine.saveData.unlockedLevel || 1;
        const cleared = this.engine.saveData.highestClearedLevel || 0;

        ctx.textAlign = 'left';
        ctx.font = '18px "Courier New", monospace';
        for (let i = 0; i < LEVELS.length; i++) {
            const level = LEVELS[i];
            const y = 160 + i * 46;
            const isUnlocked = level.id <= unlocked;
            const isCleared = level.id <= cleared;

            ctx.fillStyle = isUnlocked ? (level.isFinal ? '#FFB74D' : '#4FC3F7') : '#666';
            ctx.fillText(`${i + 1}. ${level.name}`, 90, y);

            ctx.fillStyle = isUnlocked ? '#DDD' : '#777';
            ctx.fillText(`WAVE ${level.startWave} - ${level.endWave}`, 340, y);

            ctx.fillStyle = isCleared ? '#4CAF50' : (isUnlocked ? '#FFE082' : '#888');
            ctx.fillText(isCleared ? '已通关' : (isUnlocked ? '已解锁' : '未解锁'), 470, y);
        }

        ctx.fillStyle = '#CCC';
        ctx.font = '16px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('按已解锁关卡的数字开始，ESC 返回主菜单', cx, this.height - 60);
    }

    _updateLevelClear() {
        if (this.input.isPressed(GameAction.CONFIRM) || this.input.isPressed(GameAction.USE_POWERUP)) {
            this.changeState(GameState.LEVEL_SELECT);
        }
    }

    _drawLevelClear() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fillRect(0, 0, this.width, this.height);

        const cx = this.width / 2;
        const cy = this.height / 2;
        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 38px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('关卡通过！', cx, cy - 50);

        ctx.fillStyle = '#FFE082';
        ctx.font = '20px "Courier New", monospace';
        ctx.fillText(this.engine.levelMode.name, cx, cy - 5);

        ctx.fillStyle = '#DDD';
        ctx.font = '16px "Courier New", monospace';
        ctx.fillText(`得分: ${this.engine.score}   金币: $${this.engine.coins}`, cx, cy + 35);
        ctx.fillText('按 SPACE 返回选关', cx, cy + 75);
    }

    _updateWin() {
        if (this.input.isPressed(GameAction.CONFIRM) || this.input.isPressed(GameAction.USE_POWERUP)) {
            this.changeState(GameState.MENU);
        }
    }

    _drawWin() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.76)';
        ctx.fillRect(0, 0, this.width, this.height);

        const cx = this.width / 2;
        const cy = this.height / 2;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 42px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('恭喜通关！', cx, cy - 55);

        ctx.fillStyle = '#FFF';
        ctx.font = '20px "Courier New", monospace';
        ctx.fillText('你已经完成全部关卡', cx, cy - 5);

        ctx.fillStyle = '#DDD';
        ctx.font = '16px "Courier New", monospace';
        ctx.fillText(`最终得分: ${this.engine.score}   完成波次: ${this.engine.waveNum}`, cx, cy + 35);
        ctx.fillText('按 SPACE 返回主菜单', cx, cy + 75);
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

        const isNewHighScore = this.engine.saveData.highScore === this.engine.score && this.engine.score > 0;
        const isNewHighWave = this.engine.saveData.highestWave === this.engine.waveNum && this.engine.waveNum > 0;
        if (isNewHighScore || isNewHighWave) {
            ctx.fillStyle = '#4CAF50';
            ctx.font = 'bold 16px "Courier New", monospace';
            const recordText = [];
            if (isNewHighScore) recordText.push('新最高分!');
            if (isNewHighWave) recordText.push('新最高波次!');
            ctx.fillText(recordText.join('  '), cx, cy + 70);
        }

        // Phase 7: 本局详细统计
        const st = this.engine.stats;
        const accuracy = st.shotsFired > 0 ? Math.round((st.shotsHit / st.shotsFired) * 100) : 0;
        ctx.fillStyle = '#AAA';
        ctx.font = '12px "Courier New", monospace';
        ctx.fillText(`击杀: ${st.enemiesKilled}  射击: ${st.shotsFired}  命中: ${accuracy}%  时长: ${Math.floor(st.timeAlive)}s`, cx, cy + 95);

        ctx.fillStyle = '#ccc';
        ctx.font = '18px "Courier New", monospace';
        ctx.fillText('按 SPACE 返回菜单', cx, cy + 130);
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
        if (!this.engine.levelMode.endless) {
            ctx.fillStyle = '#4FC3F7';
            ctx.font = '12px "Courier New", monospace';
            ctx.fillText(this.engine.levelMode.name, this.width - 16, 52);
            ctx.fillText(`目标: WAVE ${this.engine.levelMode.endWave}`, this.width - 16, 68);
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
