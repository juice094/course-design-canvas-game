/**
 * wave-manager.js — 波次管理器
 *
 * 负责：波次参数计算、敌人生成队列、难度曲线、波次过渡检测。
 *
 * 难度曲线设计：
 * - 敌人数：5 + waveNum * 2.5，线性递增
 * - 生成间隔：max(0.35, 2.0 - waveNum * 0.12)，随波次缩短
 * - 敌人属性：每 3 波血量 +1，每 5 波速度 +10%
 * - 类型解锁：Orc(1) → Ogre(2) → Mushroom(4) → Ghost(6) → Mummy(8) → Devil(10) → Spikey(12)
 *
 * 波次流程：
 * 1. startWave() 初始化参数
 * 2. update() 定时 spawn 敌人
 * 3. 全部生成且全部击杀 → isWaveActive = false
 * 4. 清场延迟 2 秒后 → waveComplete = true
 * 5. 偶数波 → shouldShop = true（进入商店）
 */

/**
 * 波次管理器类。
 *
 * 独立管理敌人生成节奏和难度缩放，与 GameEngine 通过回调/返回值交互，
 * 不直接操作游戏状态（分数、金币等）。
 */
class WaveManager {
    constructor() {
        /** @type {number} 当前波次编号 */
        this.waveNum = 0;
        /** @type {number} 生成计时器（秒） */
        this.spawnTimer = 0;
        /** @type {number} 生成间隔（秒） */
        this.spawnInterval = 2.0;
        /** @type {number} 已生成的敌人数 */
        this.enemiesSpawned = 0;
        /** @type {number} 本波应生成的敌人数 */
        this.enemiesToSpawn = 0;
        /** @type {boolean} 当前波次是否活跃（正在生成敌人） */
        this.isWaveActive = false;
        /** @type {number} 波次清场后等待时间（秒） */
        this.waveClearDelay = 2.0;
        /** @type {number} 清场计时器（秒） */
        this.clearTimer = 0;

        /**
         * 敌人类型解锁阈值映射表。
         * 键为 EnemyType 枚举值，值为解锁波次。
         * @type {Object<number, number>}
         */
        this.typeUnlocks = {
            [EnemyType.ORC]:      1,
            [EnemyType.OGRE]:     2,
            [EnemyType.MUSHROOM]: 4,
            [EnemyType.GHOST]:    6,
            [EnemyType.MUMMY]:    8,
            [EnemyType.DEVIL]:    10,
            [EnemyType.SPIKEY]:   12,
        };
    }

    /**
     * 开始新波次。
     * 根据波次编号计算敌人数、生成间隔等参数。
     * @param {number} waveNum — 波次编号（从 1 开始）
     * @returns {number} 本波应生成的敌人数
     */
    startWave(waveNum) {
        this.waveNum = waveNum;
        this.enemiesSpawned = 0;
        this.isWaveActive = true;
        this.clearTimer = 0;

        // 难度参数
        this.enemiesToSpawn = Math.floor(5 + waveNum * 2.5);
        this.spawnInterval = Math.max(0.35, 2.0 - waveNum * 0.12);
        this.spawnTimer = this.spawnInterval;  // 立即生成第一个

        return this.enemiesToSpawn;
    }

    /**
     * 每帧更新。
     *
     * 状态机：
     * - 活跃波次（isWaveActive = true）：定时生成敌人
     * - 间歇期（isWaveActive = false）：等待场上敌人清空，延迟后报告 waveComplete
     *
     * @param {number} dt — 时间步长（秒）
     * @param {GameEngine} engine — 游戏引擎实例，用于获取地图信息和生成敌人
     * @returns {{spawned: boolean, waveComplete: boolean, shouldShop: boolean}} 波次状态
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

    /**
     * 在地图边缘生成一个敌人。
     *
     * 从地图四边随机选择一边，在对应边缘的可通行位置生成。
     * 敌人类型根据当前波次解锁的敌人类型随机选择。
     * 敌人属性（速度、血量）会根据波次编号进行缩放。
     *
     * @param {GameEngine} engine
     */
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

        engine.spawnEnemy(type, x, y, this.waveNum);
    }

    /**
     * 获取当前波次可用的敌人类型列表。
     *
     * 遍历 typeUnlocks 映射表，筛选出解锁波次小于等于当前波次的类型。
     * 保底：若没有任何类型解锁（理论上不会发生），返回 Orc。
     *
     * @returns {number[]} EnemyType 枚举值数组
     */
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

    /**
     * 获取波次信息，用于 HUD 显示。
     * @returns {{waveNum: number, spawned: number, total: number, remaining: number, active: boolean}}
     */
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
