/**
 * powerup.js — 道具系统
 *
 * 12+ 种道具：即时效果 + 限时效果。
 * 敌人死亡后概率掉落，玩家触碰拾取。
 */

const PowerupType = {
    HEART:     'HEART',      // 回血
    COIN:      'COIN',       // +1金币
    NICKEL:    'NICKEL',     // +5金币
    LIFE:      'LIFE',       // +1命
    SPREAD:    'SPREAD',     // 8方向射击 10s
    RAPIDFIRE: 'RAPIDFIRE',  // 射速÷4 10s
    SHOTGUN:   'SHOTGUN',    // 3发散射 10s
    SPEED:     'SPEED',      // 移速×1.5 10s
    NUKE:      'NUKE',       // 清屏
    TELEPORT:  'TELEPORT',   // 随机传送+无敌
    SKULL:     'SKULL',      // 僵尸模式 10s
    SHERRIFF:  'SHERRIFF',   // 组合道具
};

/** 道具外观配置 */
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

class Powerup {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.size = 28;
        this.bobOffset = 0;
        this.bobSpeed = 3;
        this.life = 15;      // 道具在地上存在15秒后消失
        this.maxLife = 15;
        this.blinkTimer = 0;
        this.queuedForDeletion = false;
    }

    get boundingBox() {
        const half = this.size / 2;
        return {
            x: this.x - half,
            y: this.y - half,
            width: this.size,
            height: this.size
        };
    }

    update(dt) {
        this.bobOffset += dt * this.bobSpeed;
        this.life -= dt;

        // 最后3秒开始闪烁
        if (this.life < 3) {
            this.blinkTimer += dt;
        }

        if (this.life <= 0) {
            this.queuedForDeletion = true;
        }
    }

    draw(ctx) {
        const visual = PowerupVisuals[this.type];
        const bobY = Math.sin(this.bobOffset) * 3;
        const x = this.x - this.size / 2;
        const y = this.y - this.size / 2 + bobY;

        ctx.save();

        // 闪烁效果
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
     * 应用道具效果
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

    /** 根据敌人类型随机生成掉落 */
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
