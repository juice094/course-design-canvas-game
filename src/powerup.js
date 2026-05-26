/**
 * powerup.js — 道具系统
 *
 * 12+ 种道具：即时效果 + 限时效果。
 * 敌人死亡后概率掉落，玩家触碰拾取。
 */

/**
 * 道具类型枚举。
 * 分为两类：
 * - 即时效果（HEART, COIN, NICKEL, LIFE, NUKE, TELEPORT）
 * - 限时效果（SPREAD, RAPIDFIRE, SHOTGUN, SPEED, SKULL, SHERRIFF）
 */
const PowerupType = {
    HEART:     'HEART',      // 回复 1 点生命
    COIN:      'COIN',       // +1 金币
    NICKEL:    'NICKEL',     // +5 金币
    LIFE:      'LIFE',       // +1 条命
    SPREAD:    'SPREAD',     // 8方向射击，持续 10s
    RAPIDFIRE: 'RAPIDFIRE',  // 射速 ÷4，持续 10s
    SHOTGUN:   'SHOTGUN',    // 子弹扩散为 3 发，持续 10s
    SPEED:     'SPEED',      // 移速 ×1.5，持续 10s
    NUKE:      'NUKE',       // 清屏所有敌人
    TELEPORT:  'TELEPORT',   // 随机传送到安全位置 + 4s 无敌
    SKULL:     'SKULL',      // 僵尸模式（无敌），持续 10s
    SHERRIFF:  'SHERRIFF',   // 组合道具：霰弹 + 速射 + 加速，持续 20s
};

/**
 * 道具视觉配置表。
 * 每种道具对应唯一的颜色、标签文字和背景色，用于 Canvas 绘制。
 * @type {Object<string, {color: string, label: string, bg: string}>}
 */
const PowerupVisuals = {
    [PowerupType.HEART]:     { color: '#F44336', label: '♥', bg: '#FFCDD2' },
    [PowerupType.COIN]:      { color: '#FFD700', label: '$', bg: '#FFF8E1' },
    [PowerupType.NICKEL]:    { color: '#C0C0C0', label: '5', bg: '#F5F5F5' },
    [PowerupType.LIFE]:      { color: '#FF5722', label: '1UP', bg: '#FFCCBC' },
    [PowerupType.SPREAD]:    { color: '#2196F3', label: '★', bg: '#BBDEFB' },
    [PowerupType.RAPIDFIRE]: { color: '#FF9800', label: '»', bg: '#FFE0B2' },
    [PowerupType.SHOTGUN]:   { color: '#9C27B0', label: '†', bg: '#E1BEE7' },
    [PowerupType.SPEED]:     { color: '#00BCD4', label: '»»', bg: '#B2EBF2' },
    [PowerupType.NUKE]:      { color: '#FFEB3B', label: '☢', bg: '#FFF9C4' },
    [PowerupType.TELEPORT]:  { color: '#3F51B5', label: '↯', bg: '#C5CAE9' },
    [PowerupType.SKULL]:     { color: '#795548', label: '☠', bg: '#D7CCC8' },
    [PowerupType.SHERRIFF]:  { color: '#FFD700', label: '★', bg: '#FFF59D' },
};

/**
 * 道具实体类。
 *
 * 职责：
 * - 维护道具的位置、存活时间和视觉效果
 * - 提供碰撞盒供 engine 检测玩家拾取
 * - 被拾取时根据类型对玩家或游戏状态施加效果
 *
 * 生命周期：
 * 1. 敌人死亡 → `Powerup.randomDrop()` 决定是否生成
 * 2. 掉落在地面，显示浮动动画，15 秒后自动消失
 * 3. 玩家触碰 → `apply()` 执行效果 → `queuedForDeletion = true`
 */
class Powerup {
    /**
     * @param {string} type — PowerupType 常量
     * @param {number} x — 掉落位置 X（像素）
     * @param {number} y — 掉落位置 Y（像素）
     */
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.size = 28;
        this.bobOffset = 0;      // 浮动动画相位
        this.bobSpeed = 3;       // 浮动速度
        this.life = 15;          // 道具在地上存在 15 秒后消失
        this.maxLife = 15;
        this.blinkTimer = 0;     // 消失前闪烁计时器
        this.queuedForDeletion = false;
    }

    /** 碰撞盒（AABB），用于玩家拾取检测 */
    get boundingBox() {
        const half = this.size / 2;
        return {
            x: this.x - half,
            y: this.y - half,
            width: this.size,
            height: this.size
        };
    }

    /**
     * 每帧更新。
     * @param {number} dt — 秒
     */
    update(dt) {
        this.bobOffset += dt * this.bobSpeed;
        this.life -= dt;

        // 最后 3 秒开始闪烁
        if (this.life < 3) {
            this.blinkTimer += dt;
        }

        if (this.life <= 0) {
            this.queuedForDeletion = true;
        }
    }

    /**
     * 绘制道具。
     * 包含浮动动画、背景光晕、标签文字和消失前闪烁效果。
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        const visual = PowerupVisuals[this.type];
        const bobY = Math.sin(this.bobOffset) * 3;
        const x = this.x - this.size / 2;
        const y = this.y - this.size / 2 + bobY;

        ctx.save();

        // 闪烁效果：消失前 3 秒透明度交替变化
        if (this.life < 3 && Math.sin(this.blinkTimer * 10) < 0) {
            ctx.globalAlpha = 0.3;
        }

        // 背景光晕
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobY, this.size * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = visual.bg + '44';
        ctx.fill();

        // 背景方块
        ctx.fillStyle = visual.bg;
        ctx.fillRect(x, y, this.size, this.size);

        // 边框
        ctx.strokeStyle = visual.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, this.size, this.size);

        // 标签
        ctx.fillStyle = visual.color;
        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(visual.label, this.x, this.y + bobY);

        ctx.restore();
    }

    /**
     * 应用道具效果。
     * 根据道具类型对玩家属性或游戏状态产生即时/限时影响。
     * @param {Player} player
     * @param {GameEngine} engine
     */
    apply(player, engine) {
        switch (this.type) {
            case PowerupType.HEART:
                player.heal(1);
                break;
            case PowerupType.COIN:
                engine.coins += 1;
                break;
            case PowerupType.NICKEL:
                engine.coins += 5;
                break;
            case PowerupType.LIFE:
                player.addLife();
                break;
            case PowerupType.SPREAD:
                player.activatePowerup('SPREAD', 10000);
                break;
            case PowerupType.RAPIDFIRE:
                player.activatePowerup('RAPIDFIRE', 10000);
                break;
            case PowerupType.SHOTGUN:
                player.activatePowerup('SHOTGUN', 10000);
                break;
            case PowerupType.SPEED:
                player.activatePowerup('SPEED', 10000);
                break;
            case PowerupType.NUKE:
                // 清屏所有敌人
                for (const e of engine.enemies) {
                    e.health = 0;
                    e.queuedForDeletion = true;
                    engine.spawnParticles(e.x, e.y, '#FFEB3B', 16, 150);
                }
                engine.score += engine.enemies.length * 10;
                break;
            case PowerupType.TELEPORT:
                const safe = engine.map.findSafePosition();
                player.x = safe.x;
                player.y = safe.y;
                player.invincibleTimer = 4000;  // 4秒无敌
                engine.spawnParticles(player.x, player.y, '#3F51B5', 12, 100);
                break;
            case PowerupType.SKULL:
                player.activatePowerup('SKULL', 10000);
                break;
            case PowerupType.SHERRIFF:
                // 组合道具：霰弹+速射+加速，持续时间×2
                player.activatePowerup('SHOTGUN', 20000);
                player.activatePowerup('RAPIDFIRE', 20000);
                player.activatePowerup('SPEED', 20000);
                break;
        }
    }

    /**
     * 根据概率随机生成掉落道具。
     * 掉落概率：5% 道具，10% 金币，85% 无掉落。
     * @param {number} x — 掉落位置 X
     * @param {number} y — 掉落位置 Y
     * @returns {Powerup|null}
     */
    static randomDrop(x, y) {
        const roll = Math.random();
        if (roll < 0.05) {
            // 5% 概率掉落道具
            const types = [
                PowerupType.HEART, PowerupType.COIN, PowerupType.COIN,
                PowerupType.SPREAD, PowerupType.RAPIDFIRE, PowerupType.SPEED,
                PowerupType.NUKE, PowerupType.SHOTGUN
            ];
            return new Powerup(Utils.pick(types), x, y);
        } else if (roll < 0.15) {
            // 10% 概率掉落金币
            return new Powerup(Utils.chance(0.3) ? PowerupType.NICKEL : PowerupType.COIN, x, y);
        }
        return null;
    }
}
