/**
 * utils.js — 数学工具与通用函数
 */

const Utils = {
    /** 两点间欧几里得距离 */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /** 两点间曼哈顿距离（网格寻路用） */
    manhattan(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    },

    /** AABB碰撞检测：两个矩形是否相交
     *  @param {Object} a — {x, y, width, height}
     *  @param {Object} b — {x, y, width, height}
     */
    aabbIntersect(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    },

    /** 数值限制在[min, max]区间 */
    clamp(val, min, max) {
        if (val < min) return min;
        if (val > max) return max;
        return val;
    },

    /** [min, max) 区间随机浮点数 */
    randRange(min, max) {
        return min + Math.random() * (max - min);
    },

    /** [min, max] 区间随机整数 */
    randInt(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    },

    /** 按概率返回true (0~1) */
    chance(prob) {
        return Math.random() < prob;
    },

    /** 从数组中随机选取一个元素 */
    pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    /** 获取朝目标点的速度向量，归一化后乘以speed */
    getVelocityTowardPoint(fromX, fromY, toX, toY, speed) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return { x: 0, y: 0 };
        return {
            x: (dx / dist) * speed,
            y: (dy / dist) * speed
        };
    },

    /** 8方向枚举 */
    Direction: {
        UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3,
        UP_RIGHT: 4, DOWN_RIGHT: 5, DOWN_LEFT: 6, UP_LEFT: 7
    },

    /** 方向 → 速度向量映射 (speed=1时) */
    directionToVector(dir) {
        const map = {
            [this.Direction.UP]:        { x: 0,  y: -1 },
            [this.Direction.RIGHT]:     { x: 1,  y: 0  },
            [this.Direction.DOWN]:      { x: 0,  y: 1  },
            [this.Direction.LEFT]:      { x: -1, y: 0  },
            [this.Direction.UP_RIGHT]:  { x: 1,  y: -1 },
            [this.Direction.DOWN_RIGHT]:{ x: 1,  y: 1  },
            [this.Direction.DOWN_LEFT]: { x: -1, y: 1  },
            [this.Direction.UP_LEFT]:   { x: -1, y: -1 },
        };
        const v = map[dir];
        if (!v) return { x: 0, y: 0 };
        // 对角线需要归一化
        if (dir >= 4) {
            const invSqrt2 = 0.70710678;
            return { x: v.x * invSqrt2, y: v.y * invSqrt2 };
        }
        return { x: v.x, y: v.y };
    }
};
