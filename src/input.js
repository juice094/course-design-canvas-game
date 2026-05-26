/**
 * input.js — 键盘输入管理器
 *
 * 跟踪按键状态，支持持续按下(isDown)和单次触发(isPressed)。
 * 将原始keyCode映射到游戏动作名，便于后续扩展手柄/触摸输入。
 */

/**
 * 游戏动作枚举。
 * 所有游戏内可执行的操作均以字符串常量形式定义，避免魔法字符串。
 */
const GameAction = {
    MOVE_UP:    'moveUp',
    MOVE_DOWN:  'moveDown',
    MOVE_LEFT:  'moveLeft',
    MOVE_RIGHT: 'moveRight',
    SHOOT_UP:    'shootUp',
    SHOOT_DOWN:  'shootDown',
    SHOOT_LEFT:  'shootLeft',
    SHOOT_RIGHT: 'shootRight',
    USE_POWERUP: 'usePowerup',
    PAUSE:       'pause',
    CONFIRM:     'confirm',
    RESTART:     'restart',
};

/**
 * 输入管理器类。
 *
 * 职责：
 * - 监听全局键盘事件，维护按键按下/释放状态
 * - 提供帧级别的 `isPressed`（本帧首次按下）和 `isDown`（持续按住）语义
 * - 将原始键盘码（KeyboardEvent.code）映射为游戏动作（GameAction）
 * - 计算归一化的移动方向向量和射击方向数组
 *
 * 设计决策：
 * - 使用 `Set` 存储按键状态，O(1) 查询复杂度
 * - 每帧调用 `update()` 清除 pressed/released 集合，实现"单次触发"语义
 * - 移动和射击分别使用 WASD 和方向键，避免操作冲突
 */
class InputManager {
    constructor() {
        /** @type {Set<string>} 当前持续按下的按键码集合 */
        this.keysDown = new Set();
        /** @type {Set<string>} 本帧首次按下的按键码集合（下一帧清除） */
        this.keysPressed = new Set();
        /** @type {Set<string>} 本帧释放的按键码集合（下一帧清除） */
        this.keysReleased = new Set();

        /**
         * 键盘码到游戏动作的映射表。
         * @type {Object<string, string>}
         */
        this.keyMap = {
            // WASD 移动
            'KeyW':     GameAction.MOVE_UP,
            'KeyS':     GameAction.MOVE_DOWN,
            'KeyA':     GameAction.MOVE_LEFT,
            'KeyD':     GameAction.MOVE_RIGHT,
            // 方向键 移动（备用，可被下方覆盖）
            'ArrowUp':    GameAction.MOVE_UP,
            'ArrowDown':  GameAction.MOVE_DOWN,
            'ArrowLeft':  GameAction.MOVE_LEFT,
            'ArrowRight': GameAction.MOVE_RIGHT,
            // 方向键 射击（占位，下方会被覆盖为射击动作）
            'ShootUp':    GameAction.SHOOT_UP,
            'ShootDown':  GameAction.SHOOT_DOWN,
            'ShootLeft':  GameAction.SHOOT_LEFT,
            'ShootRight': GameAction.SHOOT_RIGHT,
            // 功能键
            'KeyZ':       GameAction.USE_POWERUP,
            'Space':      GameAction.USE_POWERUP,
            'Escape':     GameAction.PAUSE,
            'KeyP':       GameAction.PAUSE,
            'Enter':      GameAction.CONFIRM,
            'KeyR':       GameAction.RESTART,
        };

        // 修正：方向键专用于射击，WASD 专用于移动
        this.keyMap['ArrowUp']    = GameAction.SHOOT_UP;
        this.keyMap['ArrowDown']  = GameAction.SHOOT_DOWN;
        this.keyMap['ArrowLeft']  = GameAction.SHOOT_LEFT;
        this.keyMap['ArrowRight'] = GameAction.SHOOT_RIGHT;

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    /**
     * 清理：移除全局事件监听。
     * 在游戏卸载或页面切换时调用，防止内存泄漏。
     */
    destroy() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }

    /**
     * 键盘按下事件处理器。
     * @param {KeyboardEvent} e
     */
    _onKeyDown(e) {
        const code = e.code;
        if (!this.keysDown.has(code)) {
            this.keysPressed.add(code);
        }
        this.keysDown.add(code);

        // 阻止方向键和空格滚动页面
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code)) {
            e.preventDefault();
        }
    }

    /**
     * 键盘释放事件处理器。
     * @param {KeyboardEvent} e
     */
    _onKeyUp(e) {
        const code = e.code;
        this.keysDown.delete(code);
        this.keysReleased.add(code);
    }

    /**
     * 每帧调用，清除 pressed/released 状态。
     * 必须在游戏循环每帧结束时调用，否则 `isPressed` 会持续返回 true。
     */
    update() {
        this.keysPressed.clear();
        this.keysReleased.clear();
    }

    /**
     * 检查某动作是否当前被按住。
     * @param {string} action — GameAction 常量
     * @returns {boolean}
     */
    isDown(action) {
        for (const [code, mappedAction] of Object.entries(this.keyMap)) {
            if (mappedAction === action && this.keysDown.has(code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 检查某动作是否在本帧首次按下（单次触发）。
     * 适用于菜单确认、射击单次发射等需要"点按"语义的场景。
     * @param {string} action — GameAction 常量
     * @returns {boolean}
     */
    isPressed(action) {
        for (const [code, mappedAction] of Object.entries(this.keyMap)) {
            if (mappedAction === action && this.keysPressed.has(code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 检查某动作是否在本帧释放。
     * @param {string} action — GameAction 常量
     * @returns {boolean}
     */
    isReleased(action) {
        for (const [code, mappedAction] of Object.entries(this.keyMap)) {
            if (mappedAction === action && this.keysReleased.has(code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 获取当前按下的移动方向向量，已归一化。
     * 支持八方向移动（含对角线），对角线自动归一化防止速度溢出。
     * @returns {{x: number, y: number}} 归一化方向向量，范围 [-1, 1]
     */
    getMoveVector() {
        let x = 0, y = 0;
        if (this.isDown(GameAction.MOVE_UP))    y -= 1;
        if (this.isDown(GameAction.MOVE_DOWN))  y += 1;
        if (this.isDown(GameAction.MOVE_LEFT))  x -= 1;
        if (this.isDown(GameAction.MOVE_RIGHT)) x += 1;

        // 对角线归一化：防止同时按两个方向时速度为 sqrt(2) 倍
        if (x !== 0 && y !== 0) {
            const invSqrt2 = 0.70710678;
            x *= invSqrt2;
            y *= invSqrt2;
        }
        return { x, y };
    }

    /**
     * 获取当前按下的射击方向数组。
     * 支持同时按多个方向键（如左上 = UP + LEFT），返回对应的方向枚举数组。
     * @returns {number[]} Utils.Direction 枚举值数组
     */
    getShootDirections() {
        const dirs = [];
        if (this.isDown(GameAction.SHOOT_UP))    dirs.push(Utils.Direction.UP);
        if (this.isDown(GameAction.SHOOT_DOWN))  dirs.push(Utils.Direction.DOWN);
        if (this.isDown(GameAction.SHOOT_LEFT))  dirs.push(Utils.Direction.LEFT);
        if (this.isDown(GameAction.SHOOT_RIGHT)) dirs.push(Utils.Direction.RIGHT);
        return dirs;
    }
}
