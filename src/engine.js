/**
 * engine.js — 游戏引擎
 *
 * 负责：实体生命周期管理、碰撞解析、游戏状态更新、与Map/Player交互。
 * 是各子系统的中央集成点。
 */

class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;

        this.map = new GameMap();

        // 玩家在地图中心出生
        const spawn = this.map.findSafePosition();
        this.player = new Player(spawn.x, spawn.y);

        // 实体列表
        this.bullets = [];
        this.enemies = [];
        this.powerups = [];
        this.particles = [];

        // 游戏状态
        this.coins = 0;
        this.score = 0;
        this.waveNum = 0;
        this.isGameOver = false;

        // Phase 7: 本局统计
        this.stats = {
            shotsFired: 0,
            shotsHit: 0,
            enemiesKilled: 0,
            coinsCollected: 0,
            powerupsCollected: 0,
            damageTaken: 0,
            timeAlive: 0
        };

        // Phase 7: 屏幕震动
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        // Phase 3: 波次管理器
        this.waveManager = new WaveManager();
        this.waveManager.startWave(1);

        // Phase 4: 商店
        this.shop = new Shop();
        this.isInShop = false;

        // Phase 6: 音效
        this.audio = new AudioManager();

        // Phase 6: 存档
        this.saveData = this._loadSave();
    }

    /** 重置游戏 */
    reset() {
        const spawn = this.map.findSafePosition();
        this.player = new Player(spawn.x, spawn.y);
        this.bullets = [];
        this.enemies = [];
        this.powerups = [];
        this.particles = [];
        this.coins = 0;
        this.score = 0;
        this.waveNum = 0;
        this.isGameOver = false;
        this.waveManager = new WaveManager();
        this.waveManager.startWave(1);
        this.shop = new Shop();
        this.isInShop = false;
        this.audio.stopBGM();

        // Phase 7: 重置统计
        this.stats = {
            shotsFired: 0,
            shotsHit: 0,
            enemiesKilled: 0,
            coinsCollected: 0,
            powerupsCollected: 0,
            damageTaken: 0,
            timeAlive: 0
        };
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
    }

    /**
     * 主更新循环。
     *
     * 更新顺序（与 C# 原版一致）：
     * 1. 统计计时器（timeAlive、shakeTimer）
     * 2. 玩家输入与移动
     * 3. 子弹弹道更新
     * 4. 波次管理器（生成新敌人 / 检测波次完成）
     * 5. 商店状态更新（若处于商店）
     * 6. 敌人 AI 更新
     * 7. 道具倒计时更新
     * 8. 粒子物理更新
     * 9. 碰撞检测（子弹-地图、子弹-敌人、玩家-敌人、玩家-道具）
     * 10. 清理死亡实体
     *
     * @param {number} dt — 时间步长（秒）
     * @param {InputManager} input
     */
    update(dt, input) {
        if (this.isGameOver) return;

        // Phase 7: 统计存活时间
        this.stats.timeAlive += dt;

        // Phase 7: 屏幕震动衰减
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer < 0) {
                this.shakeTimer = 0;
                this.shakeIntensity = 0;
            }
        }

        // 1. 更新玩家
        this.player.update(dt, input, this.map, this);

        // 玩家死亡且命数耗尽 → 游戏结束
        if (this.player.lives < 0 && this.player.isDead) {
            this.isGameOver = true;
            return;
        }

        // 2. 更新子弹
        for (const b of this.bullets) {
            b.update(dt);
        }

        // 3. 波次管理器更新
        const waveResult = this.waveManager.update(dt, this);
        if (waveResult.waveComplete && !this.isInShop) {
            this.waveNum++;
            if (waveResult.shouldShop) {
                // Phase 4: 进入商店
                this.isInShop = true;
                this.shop.open(this.waveNum, this.player);
            } else {
                this.waveManager.startWave(this.waveNum + 1);
            }
        }

        // 商店更新
        if (this.isInShop) {
            const shopClosed = this.shop.update(dt, this.player, input, this);
            if (shopClosed) {
                this.isInShop = false;
                this.waveManager.startWave(this.waveNum + 1);
            }
            return;  // 商店状态下不更新其他实体
        }

        // 4. 更新敌人
        for (const e of this.enemies) {
            e.update(dt, this.player, this.map, this.enemies);
        }

        // 4. 更新道具（Phase 3加入）
        for (const p of this.powerups) {
            p.update(dt);
        }

        // 5. 更新粒子
        for (const p of this.particles) {
            p.update(dt);
        }

        // 6. 碰撞检测
        this._checkCollisions();

        // 7. 清理死亡实体
        this._cleanupEntities();
    }

    // ---------- 实体工厂 ----------

    /**
     * 生成子弹。
     * @param {number} x — 起始 X（像素）
     * @param {number} y — 起始 Y（像素）
     * @param {number} direction — Utils.Direction 枚举值
     * @param {number} damage — 伤害值
     * @param {boolean} isFriendly — true=玩家子弹, false=敌人子弹
     */
    spawnBullet(x, y, direction, damage, isFriendly) {
        this.bullets.push(new Bullet(x, y, direction, damage, isFriendly));
        if (isFriendly) {
            this.stats.shotsFired++;
            this.audio.playShoot();
        }
    }

    /**
     * 生成敌人。
     * @param {number} type — EnemyType 枚举值
     * @param {number} x — 生成位置 X（像素）
     * @param {number} y — 生成位置 Y（像素）
     * @param {number} [waveNum=1] — 当前波次编号，用于属性缩放
     */
    spawnEnemy(type, x, y, waveNum = 1) {
        this.enemies.push(new Enemy(type, x, y, waveNum));
    }

    /** 生成指定类型的道具 */
    spawnPowerup(type, x, y) {
        this.powerups.push(new Powerup(type, x, y));
    }

    /**
     * 生成粒子效果。
     * @param {number} x — 中心位置 X
     * @param {number} y — 中心位置 Y
     * @param {string} color — CSS 颜色字符串
     * @param {number} [count=8] — 粒子数量
     * @param {number} [speed=100] — 粒子初速度（像素/秒）
     */
    spawnParticles(x, y, color, count = 8, speed = 100) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Utils.randRange(-0.3, 0.3);
            this.particles.push(new Particle(x, y, color, speed, angle));
        }
    }

    // ---------- 碰撞检测 ----------

    /**
     * 碰撞检测主循环。
     *
     * 检测顺序（与更新顺序解耦，统一处理）：
     * 1. 友方子弹 vs 地图障碍 — 子弹销毁，产生碎片粒子
     * 2. 友方子弹 vs 敌人 — 敌人扣血/死亡，更新统计，掉落道具
     * 3. 玩家 vs 敌人 — 玩家受伤/死亡，触发屏幕震动
     * 4. 玩家 vs 道具 — 应用道具效果，更新统计
     */
    _checkCollisions() {
        // 子弹 vs 地图障碍（仅友方子弹）
        for (const b of this.bullets) {
            if (!b.isFriendly) continue;
            const g = this.map.pixelToGrid(b.x, b.y);
            if (this.map.getTile(g.x, g.y) === TileType.BARRIER) {
                b.queuedForDeletion = true;
                this.spawnParticles(b.x, b.y, '#FFE082', 4, 60);
            }
        }

        // 子弹 vs 敌人（Phase 2加入）
        for (const b of this.bullets) {
            if (!b.isFriendly) continue;
            for (const e of this.enemies) {
                if (e.queuedForDeletion) continue;
                if (Utils.aabbIntersect(b.boundingBox, e.boundingBox)) {
                    b.queuedForDeletion = true;
                    this.stats.shotsHit++;
                    if (e.takeDamage(b.damage)) {
                        // 敌人死亡
                        e.queuedForDeletion = true;
                        this.score += e.scoreValue;
                        this.stats.enemiesKilled++;
                        this.spawnParticles(e.x, e.y, e.deathColor, 12, 120);
                        this.audio.playEnemyDeath();
                        // Phase 3: 掉落道具
                        const drop = Powerup.randomDrop(e.x, e.y);
                        if (drop) {
                            this.powerups.push(drop);
                        }
                    } else {
                        // 受伤闪烁
                        this.spawnParticles(b.x, b.y, '#FFF', 3, 40);
                        this.audio.playHit();
                    }
                    break;
                }
            }
        }

        // 玩家 vs 敌人（Phase 2加入）
        if (!this.player.isDead) {
            for (const e of this.enemies) {
                if (e.queuedForDeletion) continue;
                if (Utils.aabbIntersect(this.player.boundingBox, e.boundingBox)) {
                    if (this.player.takeDamage()) {
                        this.stats.damageTaken++;
                        this.shakeTimer = 0.3;
                        this.shakeIntensity = 4;
                        this.spawnParticles(this.player.x, this.player.y, '#F44336', 10, 150);
                        this.audio.playPlayerDeath();
                    } else {
                        this.stats.damageTaken++;
                        this.shakeTimer = 0.15;
                        this.shakeIntensity = 2;
                    }
                    break;  // 一帧只受一次伤
                }
            }
        }

        // 玩家 vs 道具（Phase 3加入）
        for (const p of this.powerups) {
            if (p.queuedForDeletion) continue;
            if (Utils.aabbIntersect(this.player.boundingBox, p.boundingBox)) {
                p.apply(this.player, this);
                p.queuedForDeletion = true;
                if (p.type === PowerupType.COIN || p.type === PowerupType.NICKEL) {
                    this.stats.coinsCollected++;
                    this.audio.playCoin();
                } else {
                    this.stats.powerupsCollected++;
                    this.audio.playPowerup();
                }
            }
        }
    }

    // ---------- 清理 ----------

    _cleanupEntities() {
        this.bullets = this.bullets.filter(b => !b.queuedForDeletion);
        this.enemies = this.enemies.filter(e => !e.queuedForDeletion);
        this.powerups = this.powerups.filter(p => !p.queuedForDeletion);
        this.particles = this.particles.filter(p => !p.queuedForDeletion);
    }

    // ---------- 绘制 ----------

    draw(ctx) {
        ctx.save();

        // Phase 7: 屏幕震动
        if (this.shakeTimer > 0) {
            const sx = (Math.random() - 0.5) * this.shakeIntensity * 2;
            const sy = (Math.random() - 0.5) * this.shakeIntensity * 2;
            ctx.translate(sx, sy);
        }

        // 1. 地图
        this.map.draw(ctx);

        // 2. 道具（在地面层）
        for (const p of this.powerups) {
            p.draw(ctx);
        }

        // 3. 粒子（在实体下方）
        for (const p of this.particles) {
            p.draw(ctx);
        }

        // 4. 敌人
        for (const e of this.enemies) {
            e.draw(ctx);
        }

        // 5. 玩家
        this.player.draw(ctx);

        // 6. 子弹（在最上层）
        for (const b of this.bullets) {
            b.draw(ctx);
        }

        // 7. 商店（覆盖层）
        if (this.isInShop) {
            this.shop.draw(ctx, this.coins, this.player);
        }

        ctx.restore();
    }

    // ---------- 存档 ----------

    /**
     * 从 localStorage 加载存档数据。
     * @returns {{highScore: number, highestWave: number, totalCoinsEarned: number, gamesPlayed: number}}
     */
    _loadSave() {
        try {
            const raw = localStorage.getItem('prairieKingLite_save');
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {
            console.warn('Failed to load save:', e);
        }
        return { highScore: 0, highestWave: 0, totalCoinsEarned: 0, gamesPlayed: 0 };
    }

    /**
     * 将当前存档数据写入 localStorage。
     * 失败时静默处理（console.warn），不阻断游戏流程。
     */
    _saveSave() {
        try {
            localStorage.setItem('prairieKingLite_save', JSON.stringify(this.saveData));
        } catch (e) {
            console.warn('Failed to save save:', e);
        }
    }

    /**
     * 游戏结束时更新存档统计。
     * 比较本次成绩与历史最高，必要时刷新记录，然后调用 _saveSave() 持久化。
     */
    updateSaveOnGameOver() {
        this.saveData.gamesPlayed++;
        this.saveData.totalCoinsEarned += this.coins;
        if (this.score > this.saveData.highScore) {
            this.saveData.highScore = this.score;
        }
        if (this.waveNum > this.saveData.highestWave) {
            this.saveData.highestWave = this.waveNum;
        }
        this._saveSave();
    }
}

/**
 * Particle — 简单粒子效果。
 *
 * 每个粒子具有位置、速度、颜色和生命周期。
 * 更新时应用速度和阻力，生命周期结束后标记为删除。
 */
class Particle {
    /**
     * @param {number} x — 起始 X
     * @param {number} y — 起始 Y
     * @param {string} color — CSS 颜色
     * @param {number} speed — 初速度（像素/秒）
     * @param {number} angle — 发射角度（弧度）
     */
    constructor(x, y, color, speed, angle) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 0.5;      // 存活时间（秒）
        this.maxLife = 0.5;
        this.size = Utils.randRange(2, 5);
        this.queuedForDeletion = false;
    }

    /**
     * 更新粒子位置和生命周期。
     * @param {number} dt — 秒
     */
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        this.vx *= 0.95;  // 阻力
        this.vy *= 0.95;
        if (this.life <= 0) {
            this.queuedForDeletion = true;
        }
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}
