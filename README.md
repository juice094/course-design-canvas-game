# 🎮 Prairie King Lite — 俯视角射击生存 (Roguelike)

> **2026 Spring · 《Web前端开发技术》课程设计 — 游戏组**
>
> 基于 HTML5 Canvas + 原生 JavaScript 的 Roguelike 俯视角射击生存游戏。
> 玩法灵感源自《星露谷物语》内置小游戏「草原王者大冒险」(Journey of the Prairie King)。

---

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/Canvas-API-0170BE?style=flat-square" alt="Canvas API">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Roguelike-Game-8E44AD?style=flat-square" alt="Roguelike">
  <img src="https://img.shields.io/badge/license-Private-red?style=flat-square" alt="License">
</p>

---

## 📋 项目简介

本项目是一款**浏览器端 Roguelike 俯视角射击生存游戏**。玩家控制角色在有限地图中抵御一波接一波的敌人进攻，通过击杀敌人获取金币和道具，在每波间隙的商店中选择升级，尽可能生存更多波次。

区别于传统关卡制游戏，本作为**无限波次生存模式**——敌人每波都比上一波更强、更快、更多，直至玩家阵亡。每次游戏体验因随机道具掉落和商店升级选择而不同，具有高重玩价值。

### 核心玩法循环

```
[开始] → [第 1 波敌人] → [生存/击杀] → [波次间隙商店]
                                        ↓
         ← [选择升级/道具] ← [第 N+1 波（更强）]
                                        ↓
                                [玩家死亡] → [显示得分/波次]
                                    ↓
                            [重新开始（保留最高分记录）]
```

---

## 🎯 技术特性

| 特性 | 实现方式 | 状态 |
|:---|:---|:---:|
| **渲染引擎** | HTML5 Canvas 2D API | ✅ |
| **游戏循环** | `requestAnimationFrame` + Delta Time 驱动 | ✅ |
| **输入系统** | DOM Keyboard Event（WASD 移动 + 方向键射击） | ✅ |
| **碰撞检测** | AABB（轴对齐边界框）+ 分离轴移动检测 | ✅ |
| **音频系统** | Web Audio API 程序化音效生成 | ✅ |
| **状态管理** | 原生 JavaScript 类 + 状态机模式 | ✅ |
| **存储** | localStorage（最高分/最高波次/总金币/游戏次数） | ✅ |
| **粒子系统** | 死亡爆炸、受击闪烁、道具拾取效果 | ✅ |
| **屏幕震动** | 玩家受击时 Canvas 坐标偏移 | ✅ |
| **统计系统** | 射击命中率、击杀数、存活时间等 | ✅ |
| **架构** | 面向对象：12 个独立模块，Engine 中央集成 | ✅ |

---

## 📁 项目结构

```
course-design-canvas-game/
├── index.html                    # 游戏入口页面（按依赖顺序加载脚本）
├── src/                          # 源代码（~3,200 行）
│   ├── utils.js      (97 行)    # 向量数学、AABB碰撞、随机工具
│   ├── input.js      (214 行)   # 键盘输入管理器（GameAction 映射）
│   ├── map.js        (172 行)   # 16×16 瓦片网格、碰撞查询
│   ├── bullet.js     (77 行)    # 子弹物理与边界检测
│   ├── player.js     (416 行)   # 玩家移动/射击/道具/升级
│   ├── enemy.js      (461 行)   # 单 Enemy 类 + 7 种 AI（Orc/Ogre/Mushroom/Ghost/Mummy/Devil/Spikey）
│   ├── powerup.js    (236 行)   # 12 种道具、效果计时器
│   ├── wave-manager.js (203 行) # 波次生成、难度曲线、类型解锁
│   ├── shop.js       (307 行)   # 商人、购买逻辑、升级面板
│   ├── audio.js      (226 行)   # Web Audio API 程序化音效
│   ├── engine.js     (475 行)   # 实体管理、碰撞解析、游戏循环、存档
│   └── main.js       (343 行)   # 状态机、RAF循环、HUD、菜单/暂停/结束画面
├── reference/                    # 参考素材与文档（课程设计基础资料）
│   ├── MATERIALS_LICENSE_NOTICE.md
│   ├── prairie-king-analysis.md
│   └── prairie-king-*/           # 开源参考仓库素材
└── README.md                     # 本文件
```

> **注意**：全部图形使用 Canvas 原生绘制（几何图形），不依赖任何外部图片素材，规避版权风险。

---

## 🚀 快速开始

### 方式一：直接打开（推荐，无需构建）

```bash
# 克隆仓库
git clone https://github.com/juice094/course-design-canvas-game.git
cd course-design-canvas-game

# 直接用浏览器打开
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

### 方式二：本地服务器（如需跨域加载素材）

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# 然后访问 http://localhost:8080
```

### 操作方式

| 按键 | 动作 |
|:---|:---|
| `W` `A` `S` `D` | 八方向移动 |
| `↑` `↓` `←` `→` (方向键) | 向对应方向射击 |
| `Z` / `Space` | 使用道具（商店中购买） |
| `ESC` / `P` | 暂停/继续 |
| `R` | 重新开始（游戏进行中） |

---

## 🎮 游戏设计文档

### 敌人系统（7 种）

| 敌人 | 速度 | 血量 | 特性 | AI 行为 | 解锁波次 |
|:---|:---:|:---:|:---|:---|:---:|
| **Orc（兽人）** | 2 | 1 | 基础近战 | 直追玩家，25% 概率随机游走 | 1 |
| **Ogre（食人魔）** | 1 | 3 | 慢速高血 | 直追玩家，可踩踏尖刺怪 | 2 |
| **Mushroom（蘑菇）** | 3 | 2 | 快速近战 | 高速追击 | 4 |
| **Ghost（幽灵）** | 2 | 1 | **飞行** | 无视地形，惯性漂移 | 6 |
| **Mummy（木乃伊）** | 1 | 6 | 高血慢速 | 直追玩家，25% 概率随机游走 | 8 |
| **Devil（恶魔）** | 3 | 3 | **飞行** | 高速高血，最难对付 | 10 |
| **Spikey（尖刺怪）** | 3 | 2 | **变身** | 到达随机目标点后变身：无敌+血量+5 | 12 |

> 波次缩放：每 3 波血量 +1，每 5 波速度 +10%

### 道具系统（12 种）

| 道具 | 效果 | 类型 |
|:---|:---|:---:|
| **心 (HEART)** | 回复 1 点生命 | 即时 |
| **硬币 (COIN)** | +1 金币 | 即时 |
| **镍币 (NICKEL)** | +5 金币 | 即时 |
| **生命 (LIFE)** | +1 条命 | 即时 |
| **散射 (SPREAD)** | 8 方向同时射击 | 限时 10s |
| **速射 (RAPIDFIRE)** | 射击间隔 ÷ 4 | 限时 10s |
| **霰弹 (SHOTGUN)** | 子弹扩散为 3 发 | 限时 10s |
| **加速 (SPEED)** | 移速 × 1.5 | 限时 10s |
| **传送 (TELEPORT)** | 随机传送到安全位置 + 4s 无敌 | 即时 |
| **核弹 (NUKE)** | 清屏所有敌人 | 即时 |
| **骷髅 (SKULL)** | 僵尸模式（无敌） | 限时 10s |
| **警长徽章 (SHERRIFF)** | 组合：霰弹+速射+加速，持续 ×2 | 组合 |

### 商店升级系统（Roguelike 核心）

每 2 波结束后商人出现，提供 **3 选 1 随机升级**：

| 升级类型 | 效果 | 价格 |
|:---|:---|:---:|
| **弹药升级** (Ammo+1/2/3) | 子弹伤害 +1 | 15/30/45 |
| **射速升级** (FireSpeed+1/2/3) | 射击间隔缩短 15% | 10/20/30 |
| **移速升级** (RunSpeed+1/2) | 移动速度 +15% | 8/20 |
| **额外生命** (Life) | +1 条命 | 10 |
| **散射手枪** (SpreadPistol) | 永久散射效果 | 99 |
| **警长徽章** (Star) | 限时组合道具 | 10 |

### 难度曲线（波次生成算法）

```javascript
// 波次 N 的参数
enemiesToSpawn = Math.floor(5 + N * 2.5);     // 敌人数递增
spawnInterval  = Math.max(0.35, 2.0 - N * 0.12);  // 生成间隔递减
speedMult      = 1 + Math.floor(N / 5) * 0.1;    // 速度每 5 波 +10%
healthBonus    = Math.floor(N / 3);              // 血量每 3 波 +1
```

---

## 📊 开发阶段

| 阶段 | 内容 | 实际代码量 | 状态 |
|:---|:---|:---:|:---:|
| **Phase 0** | 基础架构：Canvas + 游戏循环 + 状态机 | ~250 行 | ✅ 完成 |
| **Phase 1** | 地图系统 + 玩家移动 + 8 方向射击 | ~650 行 | ✅ 完成 |
| **Phase 2** | 敌人系统（Orc / Ogre / Mushroom） | ~500 行 | ✅ 完成 |
| **Phase 3** | 道具系统 + 波次管理器 | ~450 行 | ✅ 完成 |
| **Phase 4** | 商店系统 + 购买逻辑 | ~350 行 | ✅ 完成 |
| **Phase 5** | 剩余敌人（Ghost / Mummy / Devil / Spikey）+ HUD | ~500 行 | ✅ 完成 |
| **Phase 6** | 音效系统 + 存档/读档 + 菜单完善 | ~350 行 | ✅ 完成 |
| **Phase 7** | 测试调优 + 平衡 + 统计系统 + 文档 | ~300 行 | ✅ 完成 |
| **总计** | | **~3,200 行** | ✅ |

---

## 🏗️ 架构说明

### 游戏循环

```
requestAnimationFrame(loop)
  ↓
[计算 dt] → [update(dt)] → [draw()] → [input.update()]
                ↓
        ┌───────┼───────┐
        ↓       ↓       ↓
      MENU   PLAYING   PAUSED
                    ↓
              ┌─────┼─────┐
              ↓     ↓     ↓
            SHOP  WAVE  GAMEOVER
```

### 实体更新顺序

1. 统计计时器（timeAlive、shakeTimer）
2. 玩家输入与移动
3. 子弹弹道更新
4. 波次管理器（生成新敌人 / 检测波次完成）
5. 商店状态更新（若处于商店）
6. 敌人 AI 更新
7. 道具倒计时更新
8. 粒子物理更新
9. 碰撞检测（子弹-地图、子弹-敌人、玩家-敌人、玩家-道具）
10. 清理死亡实体

### 模块依赖

```
main.js ──→ engine.js ──→ wave-manager.js
    │           │                │
    │           ├──→ player.js   └──→ enemy.js
    │           │       │              │
    │           │       └──→ powerup.js
    │           │
    │           ├──→ map.js ──→ utils.js
    │           │
    │           ├──→ bullet.js ──→ utils.js
    │           │
    │           ├──→ shop.js
    │           │
    │           ├──→ audio.js
    │           │
    │           └──→ Particle (内联)
    │
    └──→ input.js
```

---

## 📝 关键设计决策

### 为什么使用单 Enemy 类 + type 字段？

参考 C# SMAPI Mod 源码设计，采用单 `Enemy` 类 + `type` 字段 + `update()` 内 switch 模式，而非深度继承。对 4 人学生团队更易于理解和维护，同时减少原型链查找开销。

### 为什么使用程序化音效？

Web Audio API 程序化生成全部音效（噪声、方波、正弦波、锯齿波），不依赖外部音频文件。优势：
- 零外部依赖，单 HTML 文件即可运行
- 规避版权风险
- 展示对 Web Audio API 的掌握

### 为什么碰撞检测使用 AABB？

全部碰撞采用轴对齐边界框（AABB）：
- 计算简单，O(1) 复杂度
- 对于矩形/方块角色足够精确
- 无需引入复杂的分离轴定理或圆形碰撞

---

## ⚠️ 素材版权说明

本仓库 `reference/` 目录下包含从开源仓库收集的参考素材，**部分素材受《星露谷物语》版权保护**：

| 文件 | 版权状态 | 使用限制 |
|:---|:---:|:---|
| `reference/prairie-king-godot/spritemap.png` | ⚠️ 星露谷官方素材 | **仅参考，不可用于最终项目** |
| `reference/prairie-king-multiplayer/*.png` | ⚠️ 可能含星露谷素材 | **仅参考，不可用于最终项目** |
| `reference/prairie-king-analysis.md` | ✅ 自主编写 | 可自由使用 |

**课程设计最终提交代码中，所有素材必须满足以下条件之一**：
- ✅ 自制几何图形（Canvas `fillRect` / `arc` / `bezierCurveTo` 绘制）
- ✅ [itch.io](https://itch.io/game-assets/free) / [OpenGameArt](https://opengameart.org) 免费开源素材
- ✅ [freesound.org](https://freesound.org) 免费音效

详见 `reference/MATERIALS_LICENSE_NOTICE.md`。

---

## 🛠️ 技术参考

| 文档 | 路径 | 说明 |
|:---|:---|:---|
| **开源仓库分析报告** | `reference/prairie-king-analysis.md` | 4 个开源仓库审计，含完整机制设计 |
| **素材版权声明** | `reference/MATERIALS_LICENSE_NOTICE.md` | 版权分类 + 替代素材来源 |
| **原英雄抓怪物代码** | `assets/js/game.js` | 课程设计基础素材（原始代码，已弃用） |

---

## 👥 组员

| 学号 | 姓名 | 职责 | 负责模块 |
|:---|:---|:---|:---|
| （待补充） | （待补充） | 核心引擎、状态机、存档、工具 | `main.js`, `engine.js`, `utils.js` |
| （待补充） | （待补充） | 玩家、输入、子弹、地图、碰撞 | `player.js`, `bullet.js`, `input.js`, `map.js` |
| （待补充） | （待补充） | 敌人、波次管理、AI | `enemy.js`, `wave-manager.js` |
| （待补充） | （待补充） | 道具、商店、渲染、音效、HUD、粒子 | `powerup.js`, `shop.js`, `audio.js`, `particle.js` |

---

## 📄 License

Private — 仅限 2026 Spring 《Web前端开发技术》课程设计小组内部使用。

---

<p align="center">
  <sub>Built with ❤️ and HTML5 Canvas · 2026 Spring Web前端开发技术课程设计小组</sub>
</p>
