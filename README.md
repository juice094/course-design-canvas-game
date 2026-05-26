# 🎮 Prairie King Lite —— 俯视角射击生存 (Roguelike)

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
                            [重新开始（保留解锁进度）]
```

---

## 🎯 技术特性

| 特性 | 实现方式 |
|:---|:---|
| **渲染引擎** | HTML5 Canvas 2D API |
| **游戏循环** | `requestAnimationFrame` 驱动 |
| **输入系统** | DOM Keyboard Event（WASD 移动 + 方向键/空格射击） |
| **碰撞检测** | AABB（轴对齐边界框）+ 圆形碰撞 |
| **音频系统** | Web Audio API |
| **状态管理** | 原生 JavaScript 类 + 状态机模式 |
| **存储** | localStorage（最高分/解锁记录） |
| **架构** | 面向对象：Player / Enemy / Bullet / Powerup / Shop 独立类 |

---

## 📁 项目结构

```
course-design-canvas-game/
├── index.html                    # 游戏入口页面
├── src/
│   ├── game.js                   # 游戏主引擎（初始化 + 循环 + 状态机）
│   ├── player.js                 # 玩家角色（移动 + 射击 + 道具持有）
│   ├── enemy.js                  # 敌人类（7 种 AI 行为）
│   ├── bullet.js                 # 子弹系统（弹道 + 碰撞）
│   ├── powerup.js                # 道具系统（掉落 + 效果 + 计时器）
│   ├── wave-manager.js           # 波次生成器（难度曲线 + 概率算法）
│   ├── shop.js                   # 商店系统（Roguelike 升级面板）
│   ├── renderer.js               # Canvas 渲染层（精灵图 + 动画 + HUD）
│   ├── audio.js                  # Web Audio API 封装（音效 + BGM）
│   ├── input.js                  # 输入处理（键盘 + 触摸）
│   ├── map.js                    # 地图/瓦片系统（16×16 网格 + 碰撞层）
│   └── utils.js                  # 工具函数（碰撞检测 + 随机数 + 向量）
├── assets/
│   ├── images/                   # 精灵图素材（⚠️ 仅几何图形 + 免费素材）
│   ├── audio/                    # 音效文件（freesound.org 免费资源）
│   └── fonts/                    # 像素字体（可选）
├── reference/                    # 参考素材与文档
│   ├── MATERIALS_LICENSE_NOTICE.md  # ⚠️ 版权声明：星露谷素材仅参考，不可直接使用
│   ├── prairie-king-analysis.md       # 草原王者开源仓库源码分析报告
│   ├── prairie-king-godot/            # Godot 移植版参考（格式/结构）
│   ├── prairie-king-multiplayer/      # SMAPI Mod 素材参考
│   └── prairie-king-cheat/            # SMAPI Mod 配置参考
└── README.md                     # 本文件
```

> **开发阶段**：骨架已搭（`src/game.js` 含 Canvas 初始化 + 游戏循环 + 基础碰撞），各子系统待实现。

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
| `W` / `↑` | 向上移动 |
| `S` / `↓` | 向下移动 |
| `A` / `←` | 向左移动 |
| `D` / `→` | 向右移动 |
| `↑↓←→` (方向键) | 向对应方向射击 |
| `Z` / `Space` | 使用当前持有道具 |
| `ESC` / `P` | 暂停游戏 |

---

## 🎮 游戏设计文档

### 敌人系统（7 种）

| 敌人 | 速度 | 血量 | 特性 | AI 行为 |
|:---|:---:|:---:|:---|:---|
| **Orc（兽人）** | 2 | 1 | 基础近战 | 直追玩家，25% 概率随机游走 |
| **Ogre（食人魔）** | 1 | 3 | 慢速高血 | 直追玩家，可踩踏尖刺怪 |
| **Mushroom（蘑菇）** | 3 | 2 | 快速近战 | 高速追击 |
| **Ghost（幽灵）** | 2 | 1 | **飞行** | 无视地形，惯性漂移 |
| **Mummy（木乃伊）** | 1 | 6 | 高血慢速 | 直追玩家，25% 概率随机游走 |
| **Devil（恶魔）** | 3 | 3 | **飞行** | 高速高血，最难对付 |
| **Spikey（尖刺怪）** | 3 | 2 | **变身** | 到达随机目标点后变身：无敌+血量+5 |

### 道具系统（12+ 种）

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
| **传送 (TELEPORT)** | 随机传送到安全位置 | 即时 |
| **核弹 (NUKE)** | 清屏所有敌人 | 即时 |
| **骷髅 (SKULL)** | 僵尸模式（杀敌回血） | 限时 10s |
| **警长徽章 (SHERRIFF)** | 组合：散射+速射+加速，持续 ×2 | 组合 |

### 商店升级系统（Roguelike 核心）

每 2 波结束后商人出现，提供 **3 选 1 随机升级**：

| 升级类型 | 效果 | 价格 |
|:---|:---|:---:|
| **弹药升级** (Ammo+1/2/3) | 子弹伤害 +1 | 15/30/45 |
| **射速升级** (FireSpeed+1/2/3) | 射击间隔缩短 | 10/20/30 |
| **移速升级** (RunSpeed+1/2) | 移动速度 ×1.25 | 8/20 |
| **额外生命** (Life) | +1 条命 | 10 |
| **散射手枪** (SpreadPistol) | 永久散射效果 | 99 |

### 难度曲线（波次生成算法）

```javascript
// 波次 N 的参数
enemyCount = baseCount + N * 2;        // 敌人数递增
enemySpeed = baseSpeed + N * 0.1;      // 速度递增
enemyHealth = baseHealth + N * 0.5;    // 血量递增
spawnRate = max(500, 2000 - N * 100);  // 生成间隔递减
```

---

## 📝 开发路线图

| 阶段 | 内容 | 预估代码量 | 状态 |
|:---|:---|:---:|:---:|
| **Phase 1** | Canvas 引擎 + 游戏循环 + 状态机 | 300-500 行 | ✅ 已搭骨架 |
| **Phase 2** | 玩家系统（移动 + 8 方向射击） | 400-600 行 | ⏳ 待开发 |
| **Phase 3** | 敌人系统（3-4 种基础 AI） | 400-600 行 | ⏳ 待开发 |
| **Phase 4** | 子弹/碰撞/道具 | 350-550 行 | ⏳ 待开发 |
| **Phase 5** | 波次生成器 + 难度曲线 | 200-300 行 | ⏳ 待开发 |
| **Phase 6** | 商店/升级系统 | 300-400 行 | ⏳ 待开发 |
| **Phase 7** | 音效 + HUD + 菜单 | 300-400 行 | ⏳ 待开发 |
| **Phase 8** | 额外敌人（Ghost/Devil/Spikey） | 200-300 行 | ⏳ 待扩展 |
| **Phase 9** | 粒子特效 + 动画优化 | 150-200 行 | ⏳ 待扩展 |

---

## ⚠️ 素材版权说明

本仓库 `reference/` 目录下包含从开源仓库收集的参考素材，**部分素材受《星露谷物语》版权保护**：

| 文件 | 版权状态 | 使用限制 |
|:---|:---:|:---|
| `reference/prairie-king-godot/spritemap.png` | ⚠️ 星露谷官方素材 | **仅参考，不可用于最终项目** |
| `reference/prairie-king-multiplayer/*.png` | ⚠️ 可能含星露谷素材 | **仅参考，不可用于最终项目** |
| `reference/prairie-king-analysis.md` | ✅ 自主编写 | 可自由使用 |

**课程设计最终提交代码中，所有素材必须满足以下条件之一**：
- ✅ 自制几何图形（Canvas `fillRect` / `arc` 绘制）
- ✅ [itch.io](https://itch.io/game-assets/free) / [OpenGameArt](https://opengameart.org) 免费开源素材
- ✅ [freesound.org](https://freesound.org) 免费音效

详见 `reference/MATERIALS_LICENSE_NOTICE.md`。

---

## 🛠️ 技术参考

| 文档 | 路径 | 说明 |
|:---|:---|:---|
| **开源仓库分析报告** | `reference/prairie-king-analysis.md` | 4 个开源仓库审计，含完整机制设计 |
| **素材版权声明** | `reference/MATERIALS_LICENSE_NOTICE.md` | 版权分类 + 替代素材来源 |
| **原英雄抓怪物代码** | `src/game.js` | 课程设计基础素材（原始代码） |

---

## 👥 组员

（待补充）

---

## 📄 License

Private — 仅限 2026 Spring 《Web前端开发技术》课程设计小组内部使用。

---

<p align="center">
  <sub>Built with ❤️ and HTML5 Canvas · 2026 Spring Web前端开发技术课程设计小组</sub>
</p>
