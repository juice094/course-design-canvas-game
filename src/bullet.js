/**
 * bullet.js — 子弹系统
 *
 * 支持8方向弹道，边界检测，友方/敌方子弹区分。
 */

class Bullet {
    /**
     * @param {number} x — 起始X（像素）
     * @param {number} y — 起始Y（像素）
     * @param {number} direction — Utils.Direction 枚举值
     * @param {number} damage — 伤害值
     * @param {boolean} isFriendly — true=玩家子弹, false=敌人子弹
     * @param {number} [speed=480] — 速度（像素/秒）
     */
    constructor(x, y, direction, damage, isFriendly, speed = 480) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.damage = damage;
        this.isFriendly = isFriendly;
        this.speed = speed;
        this.queuedForDeletion = false;

        // 根据方向计算速度向量
        const vec = Utils.directionToVector(direction);
        this.vx = vec.x * speed;
        this.vy = vec.y * speed;

        this.radius = 3;  // 碰撞半径
        this.size = 6;    // 绘制大小
    }

    /** 每帧更新 */
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // 边界检测：超出地图范围则标记删除
        const mapW = GRID_W * TILE_SIZE;
        const mapH = GRID_H * TILE_SIZE;
        if (
            this.x < -this.size ||
            this.x > mapW + this.size ||
            this.y < -this.size ||
            this.y > mapH + this.size
        ) {
            this.queuedForDeletion = true;
        }
    }

    /** 碰撞盒（AABB） */
    get boundingBox() {
        return {
            x: this.x - this.radius,
            y: this.y - this.radius,
            width: this.radius * 2,
            height: this.radius * 2
        };
    }

    /** 绘制 */
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isFriendly ? '#FFEB3B' : '#F44336';
        ctx.fill();

        // 发光效果
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = this.isFriendly
            ? 'rgba(255, 235, 59, 0.3)'
            : 'rgba(244, 67, 54, 0.3)';
        ctx.fill();
    }
}
