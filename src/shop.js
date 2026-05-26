/**
 * shop.js — 商店系统
 *
 * 每2波结束后商人出现，提供3选1升级，消耗金币购买。
 */

const ShopItemType = {
    AMMO:        'AMMO',
    FIRESPEED:   'FIRESPEED',
    RUNSPEED:    'RUNSPEED',
    LIFE:        'LIFE',
    SPREADPISTOL:'SPREADPISTOL',
    STAR:        'STAR',
};

/** 升级价格表 */
const ShopPrices = {
    [ShopItemType.AMMO]:        [15, 30, 45],
    [ShopItemType.FIRESPEED]:   [10, 20, 30],
    [ShopItemType.RUNSPEED]:    [8,  20],
    [ShopItemType.LIFE]:        [10],
    [ShopItemType.SPREADPISTOL]:[99],
    [ShopItemType.STAR]:        [10],
};

/** 升级等级上限 */
const ShopMaxLevels = {
    [ShopItemType.AMMO]:        3,
    [ShopItemType.FIRESPEED]:   3,
    [ShopItemType.RUNSPEED]:    2,
    [ShopItemType.LIFE]:        1,
    [ShopItemType.SPREADPISTOL]:1,
    [ShopItemType.STAR]:        1,
};

class ShopItem {
    constructor(type, level, price, x, y) {
        this.type = type;
        this.level = level;
        this.price = price;
        this.x = x;
        this.y = y;
        this.width = 120;
        this.height = 140;
        this.purchased = false;
        this.label = this._getLabel();
        this.description = this._getDescription();
    }

    _getLabel() {
        const labels = {
            [ShopItemType.AMMO]:         `弹药+${this.level}`,
            [ShopItemType.FIRESPEED]:    `射速+${this.level}`,
            [ShopItemType.RUNSPEED]:     `移速+${this.level}`,
            [ShopItemType.LIFE]:         '额外生命',
            [ShopItemType.SPREADPISTOL]: '散射手枪',
            [ShopItemType.STAR]:         '警长徽章',
        };
        return labels[this.type] || this.type;
    }

    _getDescription() {
        const descs = {
            [ShopItemType.AMMO]:         `子弹伤害+1`,
            [ShopItemType.FIRESPEED]:    `射击间隔缩短`,
            [ShopItemType.RUNSPEED]:     `移动速度提升`,
            [ShopItemType.LIFE]:         '生命+1',
            [ShopItemType.SPREADPISTOL]: '永久散射效果',
            [ShopItemType.STAR]:         '霰弹+速射+加速组合',
        };
        return descs[this.type] || '';
    }

    get boundingBox() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    draw(ctx, canAfford) {
        const x = this.x - this.width / 2;
        const y = this.y - this.height / 2;

        ctx.save();

        // 背景
        ctx.fillStyle = this.purchased ? '#2E7D32' : (canAfford ? '#37474F' : '#263238');
        ctx.fillRect(x, y, this.width, this.height);

        // 边框
        ctx.strokeStyle = canAfford ? '#FFD700' : '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, this.width, this.height);

        // 名称
        ctx.fillStyle = this.purchased ? '#81C784' : '#FFF';
        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.label, this.x, y + 12);

        // 描述
        ctx.fillStyle = '#AAA';
        ctx.font = '11px "Courier New", monospace';
        ctx.fillText(this.description, this.x, y + 36);

        // 价格
        ctx.fillStyle = canAfford ? '#FFD700' : '#F44336';
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.fillText(`$${this.price}`, this.x, y + 80);

        // 已购买标记
        if (this.purchased) {
            ctx.fillStyle = '#4CAF50';
            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillText('✓', this.x, y + 105);
        } else if (canAfford) {
            ctx.fillStyle = '#4FC3F7';
            ctx.font = '11px "Courier New", monospace';
            ctx.fillText('按 Space 购买', this.x, y + 108);
        }

        ctx.restore();
    }
}

class Shop {
    constructor() {
        this.isOpen = false;
        this.items = [];
        this.merchantX = 384;   // 地图中心
        this.merchantY = -60;    // 从上方屏幕外开始
        this.merchantTargetY = 120;
        this.timer = 0;
        this.maxTime = 15;       // 15秒超时
        this.merchantSpeed = 120;
    }

    /** 打开商店 */
    open(waveNum, player) {
        this.isOpen = true;
        this.items = this._generateItems(player);
        this.merchantY = -60;
        this.timer = 0;

        // 商品位置：屏幕中央横排3个
        const startX = 384 - 160;
        for (let i = 0; i < this.items.length; i++) {
            this.items[i].x = startX + i * 160;
            this.items[i].y = 340;
        }
    }

    /** 关闭商店 */
    close() {
        this.isOpen = false;
        this.items = [];
    }

    /** 生成商品 */
    _generateItems(player) {
        const items = [];

        // 槽位1: RUNSPEED1/2 或 LIFE
        if (player.runSpeedLevel < ShopMaxLevels[ShopItemType.RUNSPEED]) {
            const level = player.runSpeedLevel + 1;
            items.push(new ShopItem(ShopItemType.RUNSPEED, level, ShopPrices.RUNSPEED[level - 1]));
        } else {
            items.push(new ShopItem(ShopItemType.LIFE, 1, ShopPrices.LIFE[0]));
        }

        // 槽位2: FIRESPEED1/2/3 或 SPREADPISTOL 或 STAR
        if (player.fireSpeedLevel < ShopMaxLevels[ShopItemType.FIRESPEED]) {
            const level = player.fireSpeedLevel + 1;
            items.push(new ShopItem(ShopItemType.FIRESPEED, level, ShopPrices.FIRESPEED[level - 1]));
        } else if (!player.hasSpreadPistol) {
            items.push(new ShopItem(ShopItemType.SPREADPISTOL, 1, ShopPrices.SPREADPISTOL[0]));
        } else {
            items.push(new ShopItem(ShopItemType.STAR, 1, ShopPrices.STAR[0]));
        }

        // 槽位3: AMMO1/2/3 或 STAR
        if (player.ammoLevel < ShopMaxLevels[ShopItemType.AMMO]) {
            const level = player.ammoLevel + 1;
            items.push(new ShopItem(ShopItemType.AMMO, level, ShopPrices.AMMO[level - 1]));
        } else {
            items.push(new ShopItem(ShopItemType.STAR, 1, ShopPrices.STAR[0]));
        }

        return items;
    }

    /** 更新 */
    update(dt, player, input, engine) {
        if (!this.isOpen) return false;

        this.timer += dt;

        // 商人走入动画
        if (this.merchantY < this.merchantTargetY) {
            this.merchantY += this.merchantSpeed * dt;
            if (this.merchantY > this.merchantTargetY) {
                this.merchantY = this.merchantTargetY;
            }
        }

        // 超时关闭
        if (this.timer >= this.maxTime) {
            this.close();
            return true;  // 通知调用者商店已关闭
        }

        // 检测购买
        for (const item of this.items) {
            if (item.purchased) continue;

            const canAfford = engine.coins >= item.price;
            const playerInRange = Utils.aabbIntersect(player.boundingBox, item.boundingBox);

            if (playerInRange && canAfford && input.isPressed(GameAction.USE_POWERUP)) {
                this._purchase(item, player, engine);
            }
        }

        return false;
    }

    /** 执行购买 */
    _purchase(item, player, engine) {
        engine.coins -= item.price;
        item.purchased = true;

        switch (item.type) {
            case ShopItemType.AMMO:
                player.ammoLevel = item.level;
                break;
            case ShopItemType.FIRESPEED:
                player.fireSpeedLevel = item.level;
                break;
            case ShopItemType.RUNSPEED:
                player.runSpeedLevel = item.level;
                break;
            case ShopItemType.LIFE:
                player.addLife();
                break;
            case ShopItemType.SPREADPISTOL:
                player.hasSpreadPistol = true;
                break;
            case ShopItemType.STAR:
                player.activatePowerup('SHOTGUN', 20000);
                player.activatePowerup('RAPIDFIRE', 20000);
                player.activatePowerup('SPEED', 20000);
                break;
        }

        engine.spawnParticles(item.x, item.y, '#FFD700', 10, 80);
    }

    /** 绘制 */
    draw(ctx, playerCoins) {
        if (!this.isOpen) return;

        const cx = 384;

        // 半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, 768, 768);

        // 商人
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(this.merchantX - 20, this.merchantY - 20, 40, 40);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(this.merchantX - 15, this.merchantY - 10, 30, 25);

        // 商店标题
        ctx.fillStyle = '#FFE082';
        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('商店 — 选择升级', cx, 260);

        // 金币
        ctx.fillStyle = '#FFD700';
        ctx.font = '18px "Courier New", monospace';
        ctx.fillText(`持有金币: $${playerCoins}`, cx, 290);

        // 倒计时
        const remaining = Math.ceil(this.maxTime - this.timer);
        ctx.fillStyle = remaining <= 3 ? '#F44336' : '#AAA';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText(`剩余时间: ${remaining}s`, cx, 470);

        // 商品
        for (const item of this.items) {
            item.draw(ctx, playerCoins >= item.price && !item.purchased);
        }

        // 操作提示
        ctx.fillStyle = '#AAA';
        ctx.font = '12px "Courier New", monospace';
        ctx.fillText('走到商品上 + 按 Space 购买', cx, 500);
    }
}
