/**
 * map.js — 瓦片地图系统
 *
 * 16×16 网格，每格 48px。
 * 瓦片类型：GRASS（草地，可通行）、SAND（沙地，可通行）、BARRIER（障碍，不可通行）。
 */

const TileType = {
    GRASS:   0,
    SAND:    1,
    BARRIER: 2
};

const TILE_SIZE = 48;
const GRID_W = 16;
const GRID_H = 16;

class GameMap {
    constructor() {
        this.tileSize = TILE_SIZE;
        this.gridW = GRID_W;
        this.gridH = GRID_H;
        this.width = this.gridW * this.tileSize;
        this.height = this.gridH * this.tileSize;

        // 初始化网格，全草地
        this.tiles = new Array(this.gridH);
        for (let y = 0; y < this.gridH; y++) {
            this.tiles[y] = new Array(this.gridW).fill(TileType.GRASS);
        }

        this._generateMap();
    }

    /** 生成地图：四周障碍 + 内部随机障碍 */
    _generateMap() {
        // 四周围墙
        for (let x = 0; x < this.gridW; x++) {
            this.tiles[0][x] = TileType.BARRIER;
            this.tiles[this.gridH - 1][x] = TileType.BARRIER;
        }
        for (let y = 0; y < this.gridH; y++) {
            this.tiles[y][0] = TileType.BARRIER;
            this.tiles[y][this.gridW - 1] = TileType.BARRIER;
        }

        // 内部随机障碍（确保玩家起始位置(8,8)周围空旷）
        const obstacleCount = Utils.randInt(12, 20);
        for (let i = 0; i < obstacleCount; i++) {
            const ox = Utils.randInt(2, this.gridW - 3);
            const oy = Utils.randInt(2, this.gridH - 3);
            // 避开中心区域（玩家出生点）
            if (Math.abs(ox - 8) <= 2 && Math.abs(oy - 8) <= 2) continue;
            this.tiles[oy][ox] = TileType.BARRIER;
            // 偶尔生成2×2障碍块
            if (Utils.chance(0.3) && ox + 1 < this.gridW - 1 && oy + 1 < this.gridH - 1) {
                this.tiles[oy][ox + 1] = TileType.BARRIER;
                this.tiles[oy + 1][ox] = TileType.BARRIER;
                this.tiles[oy + 1][ox + 1] = TileType.BARRIER;
            }
        }

        // 随机撒一些沙地（纯视觉，无碰撞差异）
        for (let y = 1; y < this.gridH - 1; y++) {
            for (let x = 1; x < this.gridW - 1; x++) {
                if (this.tiles[y][x] === TileType.GRASS && Utils.chance(0.08)) {
                    this.tiles[y][x] = TileType.SAND;
                }
            }
        }
    }

    /** 像素坐标 → 网格坐标 */
    pixelToGrid(px, py) {
        return {
            x: Math.floor(px / this.tileSize),
            y: Math.floor(py / this.tileSize)
        };
    }

    /** 获取指定网格的瓦片类型 */
    getTile(gx, gy) {
        if (gx < 0 || gx >= this.gridW || gy < 0 || gy >= this.gridH) {
            return TileType.BARRIER;
        }
        return this.tiles[gy][gx];
    }

    /** 检查像素位置是否可通行 */
    isPassable(px, py) {
        const g = this.pixelToGrid(px, py);
        return this.getTile(g.x, g.y) !== TileType.BARRIER;
    }

    /**
     * 检查矩形区域是否全部可通行。
     * 用于玩家/敌人移动前的碰撞检测，检查矩形的四个角。
     * @param {Object} rect — {x, y, width, height}（x,y为左上角）
     */
    isRectPassable(rect) {
        const corners = [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x, y: rect.y + rect.height },
            { x: rect.x + rect.width, y: rect.y + rect.height }
        ];
        return corners.every(c => this.isPassable(c.x, c.y));
    }

    /** 寻找随机安全位置（用于传送、重生） */
    findSafePosition() {
        let attempts = 0;
        while (attempts < 100) {
            const gx = Utils.randInt(2, this.gridW - 3);
            const gy = Utils.randInt(2, this.gridH - 3);
            if (this.getTile(gx, gy) !== TileType.BARRIER) {
                return {
                    x: gx * this.tileSize + this.tileSize / 2,
                    y: gy * this.tileSize + this.tileSize / 2
                };
            }
            attempts++;
        }
        // 兜底：地图中心
        return { x: this.width / 2, y: this.height / 2 };
    }

    /** 绘制地图 */
    draw(ctx) {
        for (let y = 0; y < this.gridH; y++) {
            for (let x = 0; x < this.gridW; x++) {
                const px = x * this.tileSize;
                const py = y * this.tileSize;
                const tile = this.tiles[y][x];

                switch (tile) {
                    case TileType.GRASS:
                        ctx.fillStyle = '#2E7D32';
                        ctx.fillRect(px, py, this.tileSize, this.tileSize);
                        // 草地纹理：随机小点
                        ctx.fillStyle = '#388E3C';
                        if ((x + y) % 3 === 0) {
                            ctx.fillRect(px + 8, py + 12, 4, 4);
                        }
                        if ((x + y) % 5 === 1) {
                            ctx.fillRect(px + 28, py + 32, 3, 3);
                        }
                        break;
                    case TileType.SAND:
                        ctx.fillStyle = '#C2A86B';
                        ctx.fillRect(px, py, this.tileSize, this.tileSize);
                        ctx.fillStyle = '#D4B87A';
                        ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
                        break;
                    case TileType.BARRIER:
                        ctx.fillStyle = '#3E2723';
                        ctx.fillRect(px, py, this.tileSize, this.tileSize);
                        // 石头纹理
                        ctx.fillStyle = '#4E342E';
                        ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
                        ctx.fillStyle = '#5D4037';
                        ctx.fillRect(px + 10, py + 10, this.tileSize - 20, this.tileSize - 20);
                        break;
                }

                // 网格线（非常淡，辅助调试，后续可关闭）
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.strokeRect(px, py, this.tileSize, this.tileSize);
            }
        }
    }
}
