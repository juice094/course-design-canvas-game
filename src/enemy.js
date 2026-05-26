/**
 * enemy.js — 敌人系统
 *
 * 参考C#源码设计：单 Enemy 类 + type 字段 + update() 内 switch 模式。
 * Phase 2 实现：Orc / Ogre / Mushroom 三种地面敌人。
 */

const EnemyType = {
    ORC:      0,
    OGRE:     1,
    MUSHROOM: 2,
    GHOST:    3,
    MUMMY:    4,
    DEVIL:    5,
    SPIKEY:   6
};

/** 敌人属性配置表 */
const EnemyStats = {
    [EnemyType.ORC]:      { speed: 2, health: 1, score: 10, color: '#F44336', size: 36, deathColor: '#B71C1C' },
    [EnemyType.OGRE]:     { speed: 1, health: 3, score: 30, color: '#B71C1C', size: 40, deathColor: '#7F0000' },
    [EnemyType.MUSHROOM]: { speed: 3, health: 2, score: 20, color: '#E91E63', size: 34, deathColor: '#880E4F' },
    [EnemyType.GHOST]:    { speed: 2, health: 1, score: 15, color: '#ECEFF1', size: 34, deathColor: '#CFD8DC' },
    [EnemyType.MUMMY]:    { speed: 1, health: 6, score: 40, color: '#D7CCC8', size: 36, deathColor: '#5D4037' },
    [EnemyType.DEVIL]:    { speed: 3, health: 3, score: 50, color: '#7B1FA2', size: 34, deathColor: '#4A148C' },
    [EnemyType.SPIKEY]:   { speed: 3, health: 2, score: 25, color: '#FFEB3B', size: 34, deathColor: '#F57F17' },
};

class Enemy {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;

        const stats = EnemyStats[type];
        this.speed = stats.speed;
        this.maxHealth = stats.health;
        this.health = stats.health;
        this.scoreValue = stats.score;
        this.baseColor = stats.color;
        this.deathColor = stats.deathColor;
        this.size = stats.size;
        this.width = stats.size * 0.6;   // 碰撞盒比绘制尺寸小
        this.height = stats.size * 0.6;

        // AI 状态
        this.targetX = x;
        this.targetY = y;
        this.moveCounter = 0;
        this.oppositeMotionGuy = Utils.chance(0.5);
        this.uninterested = false;       // Orc/Mummy: 随机游走模式
        this.flashTimer = 0;             // 受伤闪烁

        this.queuedForDeletion = false;
    }

    // ---------- 计算属性 ----------

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
     * @param {Player} player
     * @param {GameMap} map
     * @param {Enemy[]} otherEnemies — 其他敌人（怪物间碰撞用）
     */
    update(dt, player, map, otherEnemies) {
        if (this.flashTimer > 0) {
            this.flashTimer -= dt * 1000;
            if (this.flashTimer < 0) this.flashTimer = 0;
        }

        this.moveCounter += dt * 60;  // 换算为 tick（假设60fps）

        // 每 20 ticks 重新选择目标
        if (this.moveCounter >= 20) {
            this.moveCounter = 0;
            this._pickTarget(player, map);
        }

        // 朝目标移动
        this._moveTowardTarget(dt, map, otherEnemies);
    }

    /** 选择下一个移动目标 */
    _pickTarget(player, map) {
        // Orc: 25%概率进入"不感兴趣"模式（随机游走）
        if (this.type === EnemyType.ORC || this.type === EnemyType.MUMMY) {
            this.uninterested = Utils.chance(0.25);
        }

        if (this.uninterested) {
            // 随机选择一个地图内的可通行点
            const g = map.findSafePosition();
            this.targetX = g.x;
            this.targetY = g.y;
        } else {
            // 追击玩家（在玩家附近选一个点，而非精确位置，增加自然感）
            const offsetX = Utils.randRange(-40, 40);
            const offsetY = Utils.randRange(-40, 40);
            this.targetX = player.x + offsetX;
            this.targetY = player.y + offsetY;
        }

        // 随机反转移动偏好
        this.oppositeMotionGuy = Utils.chance(0.5);
    }

    /** 朝目标移动（带碰撞检测） */
    _moveTowardTarget(dt, map, otherEnemies) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;

        // 已到达目标附近 → 不需要移动
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;

        let mx = 0, my = 0;
        const pixelSpeed = this.speed * 48 * dt;  // speed * tileSize * dt

        // 优先移动距离更大的轴
        if (Math.abs(dx) > Math.abs(dy)) {
            mx = dx > 0 ? pixelSpeed : -pixelSpeed;
            // oppositeMotionGuy 可能反转轴优先级
            if (this.oppositeMotionGuy) {
                my = dy > 0 ? pixelSpeed : -pixelSpeed;
                mx = 0;
            }
        } else {
            my = dy > 0 ? pixelSpeed : -pixelSpeed;
            if (this.oppositeMotionGuy) {
                mx = dx > 0 ? pixelSpeed : -pixelSpeed;
                my = 0;
            }
        }

        // X轴移动 + 碰撞检测
        if (mx !== 0) {
            const newX = this.x + mx;
            const testRect = {
                x: newX - this.width / 2,
                y: this.y - this.height / 2,
                width: this.width,
                height: this.height
            };
            if (map.isRectPassable(testRect) && !this._collidesWithOtherEnemies(testRect, otherEnemies)) {
                this.x = newX;
            }
        }

        // Y轴移动 + 碰撞检测
        if (my !== 0) {
            const newY = this.y + my;
            const testRect = {
                x: this.x - this.width / 2,
                y: newY - this.height / 2,
                width: this.width,
                height: this.height
            };
            if (map.isRectPassable(testRect) && !this._collidesWithOtherEnemies(testRect, otherEnemies)) {
                this.y = newY;
            }
        }
    }

    /** 检查是否与其他敌人碰撞 */
    _collidesWithOtherEnemies(rect, otherEnemies) {
        for (const other of otherEnemies) {
            if (other === this) continue;
            if (Utils.aabbIntersect(rect, other.boundingBox)) {
                return true;
            }
        }
        return false;
    }

    // ---------- 受伤与死亡 ----------

    /** 受到伤害，返回是否死亡 */
    takeDamage(damage) {
        this.health -= damage;
        this.flashTimer = 150;  // 闪烁150ms
        if (this.health <= 0) {
            return true;  // 死亡
        }
        return false;
    }

    // ---------- 绘制 ----------

    draw(ctx) {
        const half = this.size / 2;
        const x = this.x - half;
        const y = this.y - half;

        ctx.save();

        // 受伤闪烁
        if (this.flashTimer > 0) {
            ctx.globalAlpha = 0.5;
        }

        // 身体
        ctx.fillStyle = this.baseColor;
        this._fillRoundRect(ctx, x, y, this.size, this.size, 4);

        // 每种敌人的独特绘制
        this._drawFeatures(ctx, x, y);

        ctx.restore();
    }

    _drawFeatures(ctx, px, py) {
        const s = this.size;
        switch (this.type) {
            case EnemyType.ORC:
                // 白色眼睛
                ctx.fillStyle = '#FFF';
                ctx.fillRect(px + 8, py + 10, 6, 6);
                ctx.fillRect(px + s - 14, py + 10, 6, 6);
                ctx.fillStyle = '#000';
                ctx.fillRect(px + 10, py + 12, 2, 2);
                ctx.fillRect(px + s - 12, py + 12, 2, 2);
                break;
            case EnemyType.OGRE:
                // 大个头 + 愤怒眉毛
                ctx.fillStyle = '#7F0000';
                ctx.fillRect(px + 4, py + 4, s - 8, s - 8);
                ctx.fillStyle = '#FFF';
                ctx.fillRect(px + 6, py + 10, 5, 5);
                ctx.fillRect(px + s - 11, py + 10, 5, 5);
                // 眉毛（倒V形）
                ctx.fillStyle = '#3E2723';
                ctx.fillRect(px + 4, py + 8, 8, 3);
                ctx.fillRect(px + s - 12, py + 8, 8, 3);
                break;
            case EnemyType.MUSHROOM:
                // 白色斑点
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(px + 10, py + 10, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(px + s - 10, py + s - 10, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(px + s / 2, py + s / 2, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
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
