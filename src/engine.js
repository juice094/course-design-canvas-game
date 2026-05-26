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
    }

    /** 主更新 */
    update(dt, input) {
        if (this.isGameOver) return;

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
        if (waveResult.waveComplete) {
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

    /** 生成子弹 */
    spawnBullet(x, y, direction, damage, isFriendly) {
        this.bullets.push(new Bullet(x, y, direction, damage, isFriendly));
        if (isFriendly) {
            this.audio.playShoot();
        }
    }

    /** 生成敌人 */
    spawnEnemy(type, x, y) {
        this.enemies.push(new Enemy(type, x, y));
    }

    /** 生成道具（Phase 3） */
    spawnPowerup(type, x, y) {
        // TODO: Phase 3 实现
        console.log('spawnPowerup not implemented yet:', type, x, y);
    }

    /** 生成粒子效果 */
    spawnParticles(x, y, color, count = 8, speed = 100) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Utils.randRange(-0.3, 0.3);
            this.particles.push(new Particle(x, y, color, speed, angle));
        }
    }

    // ---------- 碰撞检测 ----------

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
                    if (e.takeDamage(b.damage)) {
                        // 敌人死亡
                        e.queuedForDeletion = true;
                        this.score += e.scoreValue;
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
                        this.spawnParticles(this.player.x, this.player.y, '#F44336', 10, 150);
                        this.audio.playPlayerDeath();
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
                    this.audio.playCoin();
                } else {
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
            this.shop.draw(ctx, this.coins);
        }
    }

    // ---------- 存档 ----------

    /** 加载存档 */
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

    /** 保存存档 */
    _saveSave() {
        try {
            localStorage.setItem('prairieKingLite_save', JSON.stringify(this.saveData));
        } catch (e) {
            console.warn('Failed to save save:', e);
        }
    }

    /** 游戏结束时更新存档 */
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
 * Particle — 简单粒子效果（Phase 0/1 最小实现）
 */
class Particle {
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
