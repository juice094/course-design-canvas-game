/**
 * player.js — 玩家角色
 *
 * 负责：WASD移动（带地图碰撞）、8方向射击、受伤无敌帧、升级属性。
 */

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;   // 碰撞盒宽度
        this.height = 24;  // 碰撞盒高度
        this.size = 36;    // 绘制大小

        // 基础属性
        this.baseSpeed = 180;       // 像素/秒
        this.shootDelay = 300;      // 基础射击冷却（毫秒）
        this.maxHealth = 3;
        this.health = this.maxHealth;
        this.lives = 3;

        // 升级属性
        this.ammoLevel = 0;         // 弹药升级等级（0-3）
        this.fireSpeedLevel = 0;    // 射速升级等级（0-3）
        this.runSpeedLevel = 0;     // 移速升级等级（0-2）
        this.hasSpreadPistol = false;

        // 状态
        this.shootTimer = 0;
        this.invincibleTimer = 0;   // 无敌帧（毫秒）
        this.deathTimer = 0;        // 死亡后重生倒计时
        this.isDead = false;
        this.facing = Utils.Direction.DOWN;  // 朝向

        // 道具效果计时器（毫秒）
        this.powerups = new Map();
        // SPREAD, RAPIDFIRE, SHOTGUN, SPEED, SKULL(ZOMBIE)
    }

    // ---------- 计算属性 ----------

    /** 当前移动速度（基础 + 升级 + 道具） */
    get moveSpeed() {
        let speed = this.baseSpeed;
        // 移速升级：每级 +15%
        speed *= (1 + this.runSpeedLevel * 0.15);
        // SPEED道具：×1.5
        if (this.powerups.has('SPEED')) {
            speed *= 1.5;
        }
        return speed;
    }

    /** 当前射击间隔（毫秒） */
    get currentShootDelay() {
        let delay = this.shootDelay;
        // 射速升级
        delay *= Math.pow(0.85, this.fireSpeedLevel);
        // RAPIDFIRE道具：÷4
        if (this.powerups.has('RAPIDFIRE')) {
            delay /= 4;
        }
        return delay;
    }

    /** 当前子弹伤害 */
    get bulletDamage() {
        return 1 + this.ammoLevel;
    }

    /** 碰撞盒（用于AABB检测） */
    get boundingBox() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    // ---------- 更新 ----------

    /**
     * 每帧更新
     * @param {number} dt — 秒
     * @param {InputManager} input
     * @param {GameMap} map
     * @param {GameEngine} engine
     */
    update(dt, input, map, engine) {
        const dtMs = dt * 1000;

        // 更新计时器
        if (this.shootTimer > 0) {
            this.shootTimer -= dtMs;
        }
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dtMs;
            if (this.invincibleTimer < 0) this.invincibleTimer = 0;
        }
        if (this.deathTimer > 0) {
            this.deathTimer -= dtMs;
            if (this.deathTimer <= 0) {
                this._respawn(map);
            }
            return;  // 死亡期间不处理输入
        }

        // 更新道具计时器
        for (const [key, timer] of this.powerups) {
            const newTime = timer - dtMs;
            if (newTime <= 0) {
                this.powerups.delete(key);
            } else {
                this.powerups.set(key, newTime);
            }
        }

        // 移动
        const moveVec = input.getMoveVector();
        const speed = this.moveSpeed;
        const dx = moveVec.x * speed * dt;
        const dy = moveVec.y * speed * dt;

        // X轴移动 + 碰撞检测
        if (dx !== 0) {
            const newX = this.x + dx;
            const testRect = {
                x: newX - this.width / 2,
                y: this.y - this.height / 2,
                width: this.width,
                height: this.height
            };
            if (map.isRectPassable(testRect)) {
                this.x = newX;
            }
        }

        // Y轴移动 + 碰撞检测
        if (dy !== 0) {
            const newY = this.y + dy;
            const testRect = {
                x: this.x - this.width / 2,
                y: newY - this.height / 2,
                width: this.width,
                height: this.height
            };
            if (map.isRectPassable(testRect)) {
                this.y = newY;
            }
        }

        // 更新朝向（基于移动方向或最后射击方向）
        if (moveVec.x !== 0 || moveVec.y !== 0) {
            this._updateFacing(moveVec);
        }

        // 射击
        const shootDirs = input.getShootDirections();
        if (shootDirs.length > 0 && this.shootTimer <= 0) {
            this._shoot(shootDirs, engine);
            this.shootTimer = this.currentShootDelay;
        }
    }

    /** 根据移动向量更新朝向 */
    _updateFacing(vec) {
        if (Math.abs(vec.x) > Math.abs(vec.y)) {
            this.facing = vec.x > 0 ? Utils.Direction.RIGHT : Utils.Direction.LEFT;
        } else {
            this.facing = vec.y > 0 ? Utils.Direction.DOWN : Utils.Direction.UP;
        }
    }

    /** 执行射击 */
    _shoot(dirs, engine) {
        let bulletDirs = [];

        // 解析方向键组合为具体方向
        const hasUp = dirs.includes(Utils.Direction.UP);
        const hasDown = dirs.includes(Utils.Direction.DOWN);
        const hasLeft = dirs.includes(Utils.Direction.LEFT);
        const hasRight = dirs.includes(Utils.Direction.RIGHT);

        // 处理相反方向：只使用最后按下的（简单处理：优先右/下）
        if (hasUp && hasDown) {
            // 取消上下冲突
        }
        if (hasLeft && hasRight) {
            // 取消左右冲突
        }

        // 确定主方向
        if (hasUp && hasRight) bulletDirs.push(Utils.Direction.UP_RIGHT);
        else if (hasUp && hasLeft) bulletDirs.push(Utils.Direction.UP_LEFT);
        else if (hasDown && hasRight) bulletDirs.push(Utils.Direction.DOWN_RIGHT);
        else if (hasDown && hasLeft) bulletDirs.push(Utils.Direction.DOWN_LEFT);
        else if (hasUp) bulletDirs.push(Utils.Direction.UP);
        else if (hasDown) bulletDirs.push(Utils.Direction.DOWN);
        else if (hasLeft) bulletDirs.push(Utils.Direction.LEFT);
        else if (hasRight) bulletDirs.push(Utils.Direction.RIGHT);

        if (bulletDirs.length === 0) return;

        // SPREAD道具：8方向同时发射
        if (this.powerups.has('SPREAD') || this.hasSpreadPistol) {
            bulletDirs = [
                Utils.Direction.UP, Utils.Direction.DOWN,
                Utils.Direction.LEFT, Utils.Direction.RIGHT,
                Utils.Direction.UP_RIGHT, Utils.Direction.DOWN_RIGHT,
                Utils.Direction.DOWN_LEFT, Utils.Direction.UP_LEFT
            ];
        }
        // SHOTGUN道具：主方向 + 两侧各15度
        else if (this.powerups.has('SHOTGUN')) {
            const mainDir = bulletDirs[0];
            // 简化：主方向 + 相邻两个方向
            const adjacent = this._getAdjacentDirections(mainDir);
            bulletDirs = [mainDir, ...adjacent];
        }

        // 生成子弹
        for (const dir of bulletDirs) {
            engine.spawnBullet(this.x, this.y, dir, this.bulletDamage, true);
        }
    }

    /** 获取相邻方向（用于SHOTGUN） */
    _getAdjacentDirections(dir) {
        const adjMap = {
            [Utils.Direction.UP]:        [Utils.Direction.UP_LEFT, Utils.Direction.UP_RIGHT],
            [Utils.Direction.DOWN]:      [Utils.Direction.DOWN_LEFT, Utils.Direction.DOWN_RIGHT],
            [Utils.Direction.LEFT]:      [Utils.Direction.UP_LEFT, Utils.Direction.DOWN_LEFT],
            [Utils.Direction.RIGHT]:     [Utils.Direction.UP_RIGHT, Utils.Direction.DOWN_RIGHT],
            [Utils.Direction.UP_RIGHT]:  [Utils.Direction.UP, Utils.Direction.RIGHT],
            [Utils.Direction.DOWN_RIGHT]:[Utils.Direction.DOWN, Utils.Direction.RIGHT],
            [Utils.Direction.DOWN_LEFT]: [Utils.Direction.DOWN, Utils.Direction.LEFT],
            [Utils.Direction.UP_LEFT]:   [Utils.Direction.UP, Utils.Direction.LEFT],
        };
        return adjMap[dir] || [];
    }

    // ---------- 受伤与死亡 ----------

    /** 受到伤害 */
    takeDamage() {
        if (this.isDead || this.invincibleTimer > 0) return false;

        // SKULL/ZOMBIE模式：无敌
        if (this.powerups.has('SKULL')) return false;

        this.health--;
        if (this.health <= 0) {
            this._die();
        } else {
            this.invincibleTimer = 1500;  // 受伤后1.5秒无敌
        }
        return true;
    }

    /** 死亡 */
    _die() {
        this.isDead = true;
        this.lives--;
        if (this.lives >= 0) {
            this.deathTimer = 2000;  // 2秒后重生
        }
        // lives < 0 时由 engine 处理游戏结束
    }

    /** 重生 */
    _respawn(map) {
        this.isDead = false;
        this.health = this.maxHealth;
        this.invincibleTimer = 3000;  // 重生后3秒无敌
        const safe = map.findSafePosition();
        this.x = safe.x;
        this.y = safe.y;
        this.powerups.clear();
    }

    /** 回复生命 */
    heal(amount = 1) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }

    /** 添加命 */
    addLife() {
        this.lives++;
    }

    /** 激活道具 */
    activatePowerup(type, duration = 10000) {
        this.powerups.set(type, duration);
    }

    // ---------- 绘制 ----------

    draw(ctx) {
        if (this.isDead) return;

        const half = this.size / 2;
        const x = this.x - half;
        const y = this.y - half;

        ctx.save();

        // 无敌闪烁效果
        if (this.invincibleTimer > 0) {
            const blink = Math.sin(performance.now() / 60) > 0;
            ctx.globalAlpha = blink ? 0.4 : 1.0;
        }

        // SPEED道具：蓝色光环
        if (this.powerups.has('SPEED')) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, half + 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
            ctx.fill();
        }

        // 身体（绿色圆角矩形）
        ctx.fillStyle = '#4CAF50';
        this._fillRoundRect(ctx, x, y, this.size, this.size, 6);

        // 帽子（棕色）
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(x + 4, y - 4, this.size - 8, 8);
        ctx.fillRect(x + 2, y - 6, this.size - 4, 4);

        // 眼睛
        ctx.fillStyle = '#FFF';
        const eyeOffset = this._getEyeOffset();
        ctx.fillRect(x + 8 + eyeOffset.x, y + 10 + eyeOffset.y, 6, 6);
        ctx.fillRect(x + 22 + eyeOffset.x, y + 10 + eyeOffset.y, 6, 6);

        ctx.fillStyle = '#000';
        ctx.fillRect(x + 10 + eyeOffset.x, y + 12 + eyeOffset.y, 2, 2);
        ctx.fillRect(x + 24 + eyeOffset.x, y + 12 + eyeOffset.y, 2, 2);

        // 枪
        ctx.fillStyle = '#5D4037';
        this._drawGun(ctx, x, y);

        ctx.restore();
    }

    _getEyeOffset() {
        switch (this.facing) {
            case Utils.Direction.UP:        return { x: 0, y: -2 };
            case Utils.Direction.DOWN:      return { x: 0, y: 2 };
            case Utils.Direction.LEFT:      return { x: -2, y: 0 };
            case Utils.Direction.RIGHT:     return { x: 2, y: 0 };
            case Utils.Direction.UP_LEFT:   return { x: -2, y: -2 };
            case Utils.Direction.UP_RIGHT:  return { x: 2, y: -2 };
            case Utils.Direction.DOWN_LEFT: return { x: -2, y: 2 };
            case Utils.Direction.DOWN_RIGHT:return { x: 2, y: 2 };
            default: return { x: 0, y: 0 };
        }
    }

    _drawGun(ctx, px, py) {
        const gunLen = 10;
        const gunW = 4;
        let gx, gy, gw, gh;

        switch (this.facing) {
            case Utils.Direction.UP:
                gx = px + this.size / 2 - gunW / 2;
                gy = py - gunLen + 2;
                gw = gunW;
                gh = gunLen;
                break;
            case Utils.Direction.DOWN:
                gx = px + this.size / 2 - gunW / 2;
                gy = py + this.size - 2;
                gw = gunW;
                gh = gunLen;
                break;
            case Utils.Direction.LEFT:
                gx = px - gunLen + 2;
                gy = py + this.size / 2 - gunW / 2;
                gw = gunLen;
                gh = gunW;
                break;
            case Utils.Direction.RIGHT:
                gx = px + this.size - 2;
                gy = py + this.size / 2 - gunW / 2;
                gw = gunLen;
                gh = gunW;
                break;
            default:
                // 对角线：根据X/Y分量决定
                gx = px + this.size - 2;
                gy = py + this.size / 2 - gunW / 2;
                gw = gunLen;
                gh = gunW;
        }

        ctx.fillRect(gx, gy, gw, gh);
    }

    _fillRoundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    }
}
