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
    [EnemyType.ORC]:      { speed: 2, health: 1, score: 10, color: '#F44336', size: 36, deathColor: '#B71C1C', flying: false },
    [EnemyType.OGRE]:     { speed: 1, health: 3, score: 30, color: '#B71C1C', size: 40, deathColor: '#7F0000', flying: false },
    [EnemyType.MUSHROOM]: { speed: 3, health: 2, score: 20, color: '#E91E63', size: 34, deathColor: '#880E4F', flying: false },
    [EnemyType.GHOST]:    { speed: 2, health: 1, score: 15, color: '#ECEFF1', size: 34, deathColor: '#CFD8DC', flying: true },
    [EnemyType.MUMMY]:    { speed: 1, health: 6, score: 40, color: '#D7CCC8', size: 36, deathColor: '#5D4037', flying: false },
    [EnemyType.DEVIL]:    { speed: 3, health: 3, score: 50, color: '#7B1FA2', size: 34, deathColor: '#4A148C', flying: true },
    [EnemyType.SPIKEY]:   { speed: 3, health: 2, score: 25, color: '#FFEB3B', size: 34, deathColor: '#F57F17', flying: false },
};

class Enemy {
    constructor(type, x, y, waveNum = 1) {
        this.type = type;
        this.x = x;
        this.y = y;

        const stats = EnemyStats[type];
        // 波次缩放：速度每5波+10%，血量每3波+1
        const speedMult = 1 + Math.floor(waveNum / 5) * 0.1;
        const healthBonus = Math.floor(waveNum / 3);
        this.speed = stats.speed * speedMult;
        this.maxHealth = stats.health + healthBonus;
        this.health = this.maxHealth;
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
        this.stuckCounter = 0;           // 卡死检测计数器

        // 飞行单位（Ghost/Devil）: 惯性移动
        this.accelX = 0;
        this.accelY = 0;
        this.flying = stats.flying || false;

        // Spikey: 变身机制
        this.isSpikeyTransformed = false;
        this.spikeyTargetX = 0;
        this.spikeyTargetY = 0;
        this.spikeyTransformed = false;  // 已变身状态
        if (this.type === EnemyType.SPIKEY) {
            this._pickSpikeyTarget(map);
        }

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

        // Spikey 变身逻辑
        if (this.type === EnemyType.SPIKEY && !this.spikeyTransformed) {
            this._updateSpikey(dt, map);
            return;
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
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
            this.stuckCounter = 0;
            return;
        }

        let mx = 0, my = 0;
        const pixelSpeed = this.speed * 48 * dt;  // speed * tileSize * dt

        // 飞行单位：使用惯性移动，无视地形
        if (this.flying) {
            const targetVel = Utils.getVelocityTowardPoint(this.x, this.y, this.targetX, this.targetY, pixelSpeed);
            // 平滑加速度
            this.accelX += 0.1 * (targetVel.x > this.accelX ? 1 : -1);
            this.accelY += 0.1 * (targetVel.y > this.accelY ? 1 : -1);
            this.accelX = Utils.clamp(this.accelX, -pixelSpeed, pixelSpeed);
            this.accelY = Utils.clamp(this.accelY, -pixelSpeed, pixelSpeed);
            mx = this.accelX;
            my = this.accelY;

            // 飞行单位只检查怪物间碰撞，不检查地形
            const testRect = {
                x: this.x + mx - this.width / 2,
                y: this.y + my - this.height / 2,
                width: this.width,
                height: this.height
            };
            if (!this._collidesWithOtherEnemies(testRect, otherEnemies)) {
                this.x += mx;
                this.y += my;
                this.stuckCounter = 0;
            }
            return;
        }

        // 地面单位：优先移动距离更大的轴
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

        let moved = false;

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
                moved = true;
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
                moved = true;
            }
        }

        // 卡死检测：连续 10 帧无法移动 → 重新选择目标
        if (!moved) {
            this.stuckCounter++;
            if (this.stuckCounter > 10) {
                this.stuckCounter = 0;
                // 强制随机游走，找一个可通行的目标
                const safe = map.findSafePosition();
                this.targetX = safe.x;
                this.targetY = safe.y;
                this.uninterested = true;
            }
        } else {
            this.stuckCounter = 0;
        }
    }

    // ---------- Spikey 特殊逻辑 ----------

    _pickSpikeyTarget(map) {
        const pos = map.findSafePosition();
        this.spikeyTargetX = pos.x;
        this.spikeyTargetY = pos.y;
    }

    _updateSpikey(dt, map) {
        const dx = this.spikeyTargetX - this.x;
        const dy = this.spikeyTargetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10) {
            // 到达目标，变身！
            this.spikeyTransformed = true;
            this.health += 5;
            this.maxHealth += 5;
            this.color = '#FF9800';
            this.size = 40;
            // 变身无敌片刻
            this.flashTimer = 500;
            return;
        }

        // 朝目标移动
        const pixelSpeed = this.speed * 48 * dt;
        const mx = (dx / dist) * pixelSpeed;
        const my = (dy / dist) * pixelSpeed;

        const testRect = {
            x: this.x + mx - this.width / 2,
            y: this.y + my - this.height / 2,
            width: this.width,
            height: this.height
        };
        if (map.isRectPassable(testRect)) {
            this.x += mx;
            this.y += my;
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
            case EnemyType.GHOST:
                // 半透明 + 幽灵尾巴
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = this.baseColor;
                ctx.fillRect(px, py + s * 0.3, s, s * 0.7);
                ctx.beginPath();
                ctx.arc(px + s / 2, py + s * 0.3, s / 2, Math.PI, 0);
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.fillStyle = '#000';
                ctx.fillRect(px + s * 0.25, py + s * 0.4, 3, 3);
                ctx.fillRect(px + s * 0.65, py + s * 0.4, 3, 3);
                break;
            case EnemyType.MUMMY:
                // 绷带条纹
                ctx.fillStyle = '#8D6E63';
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(px, py + 6 + i * 10, s, 3);
                }
                ctx.fillStyle = '#FFF';
                ctx.fillRect(px + 8, py + 10, 5, 5);
                ctx.fillRect(px + s - 13, py + 10, 5, 5);
                ctx.fillStyle = '#000';
                ctx.fillRect(px + 10, py + 12, 2, 2);
                ctx.fillRect(px + s - 11, py + 12, 2, 2);
                break;
            case EnemyType.DEVIL:
                // 红色角
                ctx.fillStyle = '#D32F2F';
                ctx.beginPath();
                ctx.moveTo(px + 4, py + 4);
                ctx.lineTo(px + 10, py - 6);
                ctx.lineTo(px + 14, py + 4);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(px + s - 4, py + 4);
                ctx.lineTo(px + s - 10, py - 6);
                ctx.lineTo(px + s - 14, py + 4);
                ctx.fill();
                ctx.fillStyle = '#FFF';
                ctx.fillRect(px + 8, py + 12, 5, 5);
                ctx.fillRect(px + s - 13, py + 12, 5, 5);
                ctx.fillStyle = '#F44336';
                ctx.fillRect(px + 10, py + 14, 2, 2);
                ctx.fillRect(px + s - 11, py + 14, 2, 2);
                break;
            case EnemyType.SPIKEY:
                // 黑色尖刺
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                const spikeCount = 6;
                for (let i = 0; i < spikeCount; i++) {
                    const angle = (Math.PI * 2 / spikeCount) * i - Math.PI / 2;
                    const sx = px + s / 2 + Math.cos(angle) * s * 0.4;
                    const sy = py + s / 2 + Math.sin(angle) * s * 0.4;
                    const ex = px + s / 2 + Math.cos(angle) * s * 0.55;
                    const ey = py + s / 2 + Math.sin(angle) * s * 0.55;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(ex, ey);
                    ctx.stroke();
                }
                if (this.spikeyTransformed) {
                    // 变身后的橙色发光环
                    ctx.strokeStyle = '#FF9800';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(px + s / 2, py + s / 2, s * 0.6, 0, Math.PI * 2);
                    ctx.stroke();
                }
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
