/**
 * achievement.js — 成就系统模块
 *
 * 负责：成就配置、达成条件检测、解锁提示、本地保存和成就列表展示。
 * 该模块独立于关卡/商店/战斗系统，适合作为单独功能模块说明。
 */

const ACHIEVEMENTS = [
    { id: 'first_blood', name: '初次战斗', desc: '击败第 1 个敌人', condition: engine => engine.stats.enemiesKilled >= 1 },
    { id: 'wave_1', name: '通过试炼', desc: '完成第 1 波敌人', condition: engine => engine.waveNum >= 1 },
    { id: 'wave_5', name: '生存专家', desc: '完成第 5 波敌人', condition: engine => engine.waveNum >= 5 },
    { id: 'coin_20', name: '金币猎人', desc: '累计获得 20 枚金币', condition: engine => (engine.saveData.totalCoinsEarned || 0) + engine.stats.coinsCollected >= 20 },
    { id: 'shop_first', name: '精明买家', desc: '在商店购买 1 次升级', condition: engine => engine.stats.shopPurchases >= 1 },
    { id: 'survive_60', name: '坚持到底', desc: '单局存活 60 秒', condition: engine => engine.stats.timeAlive >= 60 },
    { id: 'level_1_clear', name: '关卡起步', desc: '通关第 1 关', condition: engine => (engine.saveData.highestClearedLevel || 0) >= 1 },
    { id: 'final_clear', name: '通关勇者', desc: '完成最终关', condition: engine => (engine.saveData.highestClearedLevel || 0) >= 5 }
];

class AchievementManager {
    constructor() {
        this.storageKey = 'prairieKingLite_achievements';
        this.unlocked = this._load();
        this.queue = [];
        this.toastTimer = 0;
        this.toastDuration = 3;
        this.currentToast = null;
    }

    _load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.warn('Failed to load achievements:', e);
        }
        return {};
    }

    _save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.unlocked));
        } catch (e) {
            console.warn('Failed to save achievements:', e);
        }
    }

    get totalCount() {
        return ACHIEVEMENTS.length;
    }

    get unlockedCount() {
        return Object.keys(this.unlocked).length;
    }

    isUnlocked(id) {
        return !!this.unlocked[id];
    }

    unlock(id) {
        if (this.unlocked[id]) return false;
        const achievement = ACHIEVEMENTS.find(a => a.id === id);
        if (!achievement) return false;

        this.unlocked[id] = {
            unlockedAt: new Date().toISOString()
        };
        this._save();
        this.queue.push(achievement);
        return true;
    }

    update(engine, dt) {
        for (const achievement of ACHIEVEMENTS) {
            if (!this.isUnlocked(achievement.id) && achievement.condition(engine)) {
                this.unlock(achievement.id);
            }
        }

        if (!this.currentToast && this.queue.length > 0) {
            this.currentToast = this.queue.shift();
            this.toastTimer = this.toastDuration;
        }

        if (this.currentToast) {
            this.toastTimer -= dt;
            if (this.toastTimer <= 0) {
                this.currentToast = null;
                this.toastTimer = 0;
            }
        }
    }

    drawToast(ctx, canvasWidth) {
        if (!this.currentToast) return;

        const alpha = Math.min(1, this.toastTimer / 0.3, (this.toastDuration - this.toastTimer) / 0.3);
        const boxWidth = 390;
        const boxHeight = 78;
        const x = (canvasWidth - boxWidth) / 2;
        const y = 24;

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = 'rgba(20, 20, 35, 0.92)';
        ctx.fillRect(x, y, boxWidth, boxHeight);
        ctx.strokeStyle = '#FFD54F';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, boxWidth, boxHeight);

        ctx.fillStyle = '#FFD54F';
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('成就解锁！', x + 20, y + 12);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.fillText(this.currentToast.name, x + 20, y + 36);

        ctx.fillStyle = '#CCCCCC';
        ctx.font = '12px "Courier New", monospace';
        ctx.fillText(this.currentToast.desc, x + 20, y + 57);
        ctx.restore();
    }

    drawList(ctx, width, height) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        ctx.fillStyle = '#FFE082';
        ctx.font = 'bold 38px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('成就列表', cx, 70);

        ctx.fillStyle = '#AAA';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText(`已解锁 ${this.unlockedCount} / ${this.totalCount}`, cx, 110);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = '16px "Courier New", monospace';

        for (let i = 0; i < ACHIEVEMENTS.length; i++) {
            const achievement = ACHIEVEMENTS[i];
            const unlocked = this.isUnlocked(achievement.id);
            const y = 155 + i * 52;

            ctx.fillStyle = unlocked ? '#263238' : '#202033';
            ctx.fillRect(80, y - 8, width - 160, 42);

            ctx.fillStyle = unlocked ? '#4CAF50' : '#777';
            ctx.fillText(unlocked ? '[已解锁]' : '[未解锁]', 100, y);

            ctx.fillStyle = unlocked ? '#FFFFFF' : '#999';
            ctx.fillText(achievement.name, 210, y);

            ctx.fillStyle = unlocked ? '#CCCCCC' : '#777';
            ctx.font = '12px "Courier New", monospace';
            ctx.fillText(achievement.desc, 210, y + 22);
            ctx.font = '16px "Courier New", monospace';
        }

        ctx.fillStyle = '#CCC';
        ctx.font = '16px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('按 ESC / SPACE 返回主菜单', cx, height - 60);
    }
}
