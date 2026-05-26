/**
 * input.js — 键盘输入管理器
 *
 * 跟踪按键状态，支持持续按下(isDown)和单次触发(isPressed)。
 * 将原始keyCode映射到游戏动作名，便于后续扩展手柄/触摸输入。
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
};

class InputManager {
    constructor() {
        this.keysDown = new Set();
        this.keysPressed = new Set();   // 仅当前帧按下（下一帧清除）
        this.keysReleased = new Set();  // 仅当前帧释放（下一帧清除）

        // keyCode → GameAction 映射
        this.keyMap = {
            // WASD 移动
            'KeyW':     GameAction.MOVE_UP,
            'KeyS':     GameAction.MOVE_DOWN,
            'KeyA':     GameAction.MOVE_LEFT,
            'KeyD':     GameAction.MOVE_RIGHT,
            // 方向键 移动（备用）
            'ArrowUp':    GameAction.MOVE_UP,
            'ArrowDown':  GameAction.MOVE_DOWN,
            'ArrowLeft':  GameAction.MOVE_LEFT,
            'ArrowRight': GameAction.MOVE_RIGHT,
            // 方向键 射击
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
        };

        // 注意：方向键同时用于移动和射击，但射击使用keydown事件的方向键
        // 移动使用WASD，射击使用方向键——这是草原王者的设计
        // 这里需要区分：ArrowUp在keyMap中被映射为MOVE_UP
        // 但根据设计文档，方向键应该用于射击
        // 修正：WASD移动，方向键射击
        this.keyMap['ArrowUp']    = GameAction.SHOOT_UP;
        this.keyMap['ArrowDown']  = GameAction.SHOOT_DOWN;
        this.keyMap['ArrowLeft']  = GameAction.SHOOT_LEFT;
        this.keyMap['ArrowRight'] = GameAction.SHOOT_RIGHT;

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    /** 清理：移除事件监听 */
    destroy() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }

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

    _onKeyUp(e) {
        const code = e.code;
        this.keysDown.delete(code);
        this.keysReleased.add(code);
    }

    /** 每帧调用，清除pressed/released状态 */
    update() {
        this.keysPressed.clear();
        this.keysReleased.clear();
    }

    /** 检查某动作是否当前被按住 */
    isDown(action) {
        for (const [code, mappedAction] of Object.entries(this.keyMap)) {
            if (mappedAction === action && this.keysDown.has(code)) {
                return true;
            }
        }
        return false;
    }

    /** 检查某动作是否在本帧首次按下（单次触发） */
    isPressed(action) {
        for (const [code, mappedAction] of Object.entries(this.keyMap)) {
            if (mappedAction === action && this.keysPressed.has(code)) {
                return true;
            }
        }
        return false;
    }

    /** 检查某动作是否在本帧释放 */
    isReleased(action) {
        for (const [code, mappedAction] of Object.entries(this.keyMap)) {
            if (mappedAction === action && this.keysReleased.has(code)) {
                return true;
            }
        }
        return false;
    }

    /** 获取当前按下的移动方向向量 {x, y}，已归一化 */
    getMoveVector() {
        let x = 0, y = 0;
        if (this.isDown(GameAction.MOVE_UP))    y -= 1;
        if (this.isDown(GameAction.MOVE_DOWN))  y += 1;
        if (this.isDown(GameAction.MOVE_LEFT))  x -= 1;
        if (this.isDown(GameAction.MOVE_RIGHT)) x += 1;

        // 对角线归一化
        if (x !== 0 && y !== 0) {
            const invSqrt2 = 0.70710678;
            x *= invSqrt2;
            y *= invSqrt2;
        }
        return { x, y };
    }

    /** 获取当前按下的射击方向数组（可能多个，如对角线） */
    getShootDirections() {
        const dirs = [];
        if (this.isDown(GameAction.SHOOT_UP))    dirs.push(Utils.Direction.UP);
        if (this.isDown(GameAction.SHOOT_DOWN))  dirs.push(Utils.Direction.DOWN);
        if (this.isDown(GameAction.SHOOT_LEFT))  dirs.push(Utils.Direction.LEFT);
        if (this.isDown(GameAction.SHOOT_RIGHT)) dirs.push(Utils.Direction.RIGHT);
        return dirs;
    }
}
