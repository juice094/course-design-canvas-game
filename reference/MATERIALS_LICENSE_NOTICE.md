# 草原王者 (Journey of the Prairie King) 参考素材 —— 版权与使用声明

> ⚠️ **重要警告**：本目录下的部分素材源自《星露谷物语》(Stardew Valley)，受 ConcernedApe 版权保护。
> 这些素材仅供**个人学习参考**，**不可**直接用于商业项目或公开分发。
> 课程设计作业中，建议使用免费替代素材或自制几何图形。

---

## 目录结构

`
reference/
├── MATERIALS_LICENSE_NOTICE.md    ← 本文件（版权声明）
├── prairie-king-analysis.md       ← 开源仓库源码分析报告
├── prairie-king-godot/            ← Godot 移植版参考
│   ├── spritemap.png              ← ⚠️ 可能源自星露谷官方素材（版权保护）
│   ├── new_sprite_frames.tres     ← Godot 精灵帧配置（参考格式）
│   ├── project.godot              ← Godot 项目配置（参考）
│   └── new_script.gd              ← GDScript 脚本（参考逻辑）
├── prairie-king-multiplayer/      ← SMAPI 多人 Mod 素材
│   ├── checkMark.png
│   ├── jotpk_start_screen.png
│   ├── poppetjes.png
│   ├── poppetjes_lobby.png
│   └── shopBubble.png             ← ⚠️ 可能源自星露谷官方素材
└── prairie-king-cheat/            ← SMAPI 作弊 Mod 配置
    ├── manifest.json
    └── ModConfig.cs
`

---

## 素材分类与版权状态

### ⚠️ 受版权保护（仅参考，不可直接使用）

| 文件 | 来源 | 版权归属 | 说明 |
|:---|:---|:---|:---|
| spritemap.png | safan41/Journey-of-The-Prairie-King (Godot 移植) | ConcernedApe (Stardew Valley 原作者) | 星露谷游戏内精灵图提取，**严禁商用/公开分发** |
| shopBubble.png | scayze/multiprairie (SMAPI Mod) | ConcernedApe | 星露谷 UI 素材，**严禁商用/公开分发** |
| jotpk_start_screen.png | scayze/multiprairie | ConcernedApe | 星露谷游戏内画面，**严禁商用/公开分发** |

### ✅ 可自由参考/学习（无版权风险）

| 文件 | 来源 | 说明 |
|:---|:---|:---|
| 
ew_script.gd | Godot 移植版 | GDScript 脚本，代码逻辑参考 |
| 
ew_sprite_frames.tres | Godot 移植版 | Godot 精灵帧配置文件，格式参考 |
| project.godot | Godot 移植版 | Godot 引擎项目配置 |
| manifest.json | SMAPI Mod | SMAPI Mod 元数据配置 |
| ModConfig.cs | SMAPI Mod | C# 配置代码，结构参考 |
| prairie-king-analysis.md | 格雷整理 | 源码分析报告，自主编写 |

---

## 课程设计推荐素材方案

### 方案 A：免费开源素材（推荐）

| 来源 | 搜索关键词 | 适用场景 |
|:---|:---|:---|
| [itch.io](https://itch.io/game-assets/free) | "top down shooter", "roguelike", "pixel art" | 角色、敌人、道具精灵图 |
| [OpenGameArt](https://opengameart.org) | "shooter", "dungeon", "retro" | 背景、瓦片地图、音效 |
| [Craftpix.net](https://craftpix.net/freebies/) | "character sprite", "tileset" | 角色动画、环境素材 |
| [Game-Icons.net](https://game-icons.net) | "sword", "heart", "skull" | 道具/技能图标（SVG） |

### 方案 B：自制几何图形（课程设计可接受）

课程设计**不要求高质量美术**。以下简单图形完全可接受：

| 元素 | 绘制方式 | Canvas 代码示例 |
|:---|:---|:---|
| 玩家 | 绿色方块 + 小矩形（枪） | ctx.fillRect(x, y, 16, 16) |
| Orc（兽人） | 红色方块 + 2 白点（眼） | ctx.fillRect() + ctx.fillStyle = 'white' |
| Ghost（幽灵） | 白色半透明圆角矩形 | ctx.globalAlpha = 0.7 |
| Ogre（食人魔） | 大块深红色矩形 | ctx.fillRect(x, y, 24, 24) |
| 子弹 | 黄色 4×4 像素 | ctx.fillRect(x, y, 4, 4) |
| 心道具 | 红色方块 + "H" 字母 | ctx.fillRect() + ctx.fillText('H', ...) |
| 硬币道具 | 黄色方块 + "C" 字母 | ctx.fillRect() + ctx.fillText('C', ...) |

### 方案 C：AI 生成素材

- [PixelLab](https://pixellab.ai/) — 免费像素画生成
- [Scenario.gg](https://www.scenario.gg/) — 游戏资产生成（部分免费）

---

## 开源仓库源码分析（设计参考）

这些仓库的**游戏机制设计**可以合法借鉴，但**代码必须自己重写**：

| 仓库 | 可借鉴内容 | 不可移植内容 |
|:---|:---|:---|
| safan41/Journey-of-The-Prairie-King | Godot 场景结构、精灵图组织方式 | GDScript 代码（语言不同）、官方素材 |
| scayze/multiprairie | C# 游戏逻辑设计（敌人 AI、道具效果、波次算法） | XNA/MonoGame 渲染代码、SMAPI API 调用、官方素材 |
| mucchan/sv-mod-prairie-king | Mod 配置结构、作弊参数设计 | SMAPI 框架代码 |

---

## 提交说明

本参考素材包由格雷于 **2026-05-26** 整理，用于《Web前端开发技术》课程设计项目。

所有有版权风险的素材已明确标注。**课程设计最终提交代码中，不应包含任何星露谷官方素材**。

---

_格雷整理。2026-05-26。_
