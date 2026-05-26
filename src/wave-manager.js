/**
 * wave-manager.js — 波次管理器
 *
 * 负责：波次参数计算、敌人生成队列、难度曲线、波次过渡检测。
 */

class WaveManager {
    constructor() {
        this.waveNum = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 2.0;
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = 0;
        this.isWaveActive = false;
        this.waveClearDelay = 2.0;   // 波次清场后等待时间
        this.clearTimer = 0;

        // 敌人类型解锁阈值
        this.typeUnlocks = {
            [EnemyType.ORC]:      1,
            [EnemyType.OGRE]:     4,
            [EnemyType.MUSHROOM]: 6,
            [EnemyType.GHOST]:    10,
            [EnemyType.MUMMY]:    14,
            [EnemyType.DEVIL]:    18,
            [EnemyType.SPIKEY]:   22,
        };
    }

    /** 开始新波次 */
    startWave(waveNum) {
        this.waveNum = waveNum;
        this.enemiesSpawned = 0;
        this.isWaveActive = true;
        this.clearTimer = 0;

        // 难度参数
        this.enemiesToSpawn = Math.floor(5 + waveNum * 2);
        this.spawnInterval = Math.max(0.5, 2.0 - waveNum * 0.1);
        this.spawnTimer = this.spawnInterval;  // 立即生成第一个

        return this.enemiesToSpawn;
    }

    /**
     * 每帧更新
     * @param {number} dt — 秒
     * @param {GameEngine} engine
     * @returns {Object} { spawned: boolean, waveComplete: boolean, shouldShop: boolean }
     */
    update(dt, engine) {
        let spawned = false;
        let waveComplete = false;
        let shouldShop = false;

        if (!this.isWaveActive) {
            // 波次间歇期：检查是否所有敌人被清完
            if (engine.enemies.length === 0) {
                this.clearTimer += dt;
                if (this.clearTimer >= this.waveClearDelay) {
                    // 波次彻底结束，准备进入下一波或商店
                    waveComplete = true;
                    shouldShop = this.waveNum > 0 && this.waveNum % 2 === 0;
                }
            }
            return { spawned, waveComplete, shouldShop };
        }

        // 活跃波次：定时生成敌人
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval && this.enemiesSpawned < this.enemiesToSpawn) {
            this.spawnTimer = 0;
            this._spawnEnemy(engine);
            this.enemiesSpawned++;
            spawned = true;
        }

        // 所有敌人已生成且全部被击杀 → 波次结束
        if (this.enemiesSpawned >= this.enemiesToSpawn && engine.enemies.length === 0) {
            this.isWaveActive = false;
            this.clearTimer = 0;
        }

        return { spawned, waveComplete, shouldShop };
    }

    /** 在地图边缘生成一个敌人 */
    _spawnEnemy(engine) {
        const types = this._getAvailableEnemyTypes();
        const type = Utils.pick(types);

        // 选择地图四边之一
        const edge = Utils.randInt(0, 3);
        const tileSize = engine.map.tileSize;
        let x, y;

        switch (edge) {
            case 0: // 上边
                x = Utils.randInt(1, engine.map.gridW - 2) * tileSize + tileSize / 2;
                y = tileSize * 1.5;
                break;
            case 1: // 右边
                x = (engine.map.gridW - 2) * tileSize + tileSize / 2;
                y = Utils.randInt(1, engine.map.gridH - 2) * tileSize + tileSize / 2;
                break;
            case 2: // 下边
                x = Utils.randInt(1, engine.map.gridW - 2) * tileSize + tileSize / 2;
                y = (engine.map.gridH - 2) * tileSize + tileSize / 2;
                break;
            case 3: // 左边
                x = tileSize * 1.5;
                y = Utils.randInt(1, engine.map.gridH - 2) * tileSize + tileSize / 2;
                break;
        }

        engine.spawnEnemy(type, x, y);
    }

    /** 获取当前波次可用的敌人类型 */
    _getAvailableEnemyTypes() {
        const available = [];
        for (const [type, unlockWave] of Object.entries(this.typeUnlocks)) {
            if (this.waveNum >= unlockWave) {
                available.push(parseInt(type));
            }
        }
        // 保底：至少有一种敌人
        if (available.length === 0) {
            available.push(EnemyType.ORC);
        }
        return available;
    }

    /** 获取波次信息（用于HUD） */
    getWaveInfo() {
        return {
            waveNum: this.waveNum,
            spawned: this.enemiesSpawned,
            total: this.enemiesToSpawn,
            remaining: this.enemiesToSpawn - this.enemiesSpawned,
            active: this.isWaveActive
        };
    }
}
