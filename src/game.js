/* game.js 英雄抓怪物小游戏 */
//创建canvas，作为游戏的舞台 
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");//生成绘图环境
canvas.width = 512;  //设置canvas的宽度
canvas.height = 480;  //设置canvas的高度
document.body.appendChild(canvas);//将创建的canvas添加到body中
//为背景图像加载做好准备
var bgReady = false;
var bgImage = new Image();
bgImage.onload = function () {bgReady = true;};
bgImage.src = "pro132/images/background.png";

// 为英雄图像加载做好准备
var heroReady = false;
var heroImage = new Image();
heroImage.onload = function () {	heroReady = true;};
heroImage.src = "pro132/images/hero.png";

// 加载怪物图像Monster
var monsterReady = false;//定义怪物准备逻辑量
var monsterImage = new Image(); //定义怪物图像
monsterImage.onload = function () {	monsterReady = true;};//动态指派事件
monsterImage.src = "pro132/images/monster.png";//给img的src属性赋值

// 游戏对象
var hero = {
	speed: 256, // 每秒运动的像素，英雄需要移动
	x:0,y:0
};
var monster = {x:0,y:0};//定义怪物对象,游戏中不移动
var monstersCaught = 0;//存储怪物被捉住的次数

// 处理用户按键操作 
var keysDown = {};//该对象用于保存用户按下的键值(keyCode)
//增加keydown事件监听，把用户的输入先保存下来而不是立即响应
addEventListener("keydown", function (e) {
	keysDown[e.keyCode] = true;    //	
}, false);
//增加keyup事件监听
addEventListener("keyup", function (e) {
	delete keysDown[e.keyCode];		
}, false);


//当玩家捉住一只怪物后复位，开始一轮新游戏。
var reset = function () {//英雄图像坐标位于canvas中心位置上
	hero.x = canvas.width / 2;
	hero.y = canvas.height / 2;
	
	//将怪物随机扔在屏幕上，重新生成怪物的坐标
	monster.x = 32 + (Math.random() * (canvas.width - 64));
	monster.y = 32 + (Math.random() * (canvas.height - 64));
};

// Update game objects
//更新游戏对象
var update = function (modifier) {
	if (38 in keysDown) {//玩家按住上箭头
		hero.y -= hero.speed * modifier;//修改英雄图像的Y坐标
	}
	if (40 in keysDown) { //玩家按住下箭头
		hero.y += hero.speed * modifier;//修改英雄图像的Y坐标
	}
	if (37 in keysDown) { //玩家按住左箭头
		hero.x -= hero.speed * modifier;//修改英雄图像的X坐标
	}
	if (39 in keysDown) { //玩家按住右箭头
		hero.x += hero.speed * modifier;//修改英雄图像的y坐标
	}
	
	// 英雄与怪物是否碰到一起？根据坐标来判断,相互间隔32像素以内，算相遇一次
	if (
		hero.x <= (monster.x + 32)
		&& monster.x <= (hero.x + 32)
		&& hero.y <= (monster.y + 32)
		&& monster.y <= (hero.y + 32)
	) {
		++monstersCaught;//累计捉到的次数
		reset();
	}
};

// 绘制图像所有事物（渲染事件）
var render = function () {
	if (bgReady) {
		ctx.drawImage(bgImage, 0, 0);//背景图像从（0，0）处开始绘制
	}

	if (heroReady) {
		ctx.drawImage(heroImage, hero.x, hero.y);//从指定位置处开始绘制
	}

	if (monsterReady) {
		ctx.drawImage(monsterImage, monster.x, monster.y);//从指定位置处开始绘制
	}

	// 显示小妖怪捉到的次数
	ctx.fillStyle = "rgb(255, 10, 10)";  //设置填充样式
	ctx.font = "24px Helvetica";    //设置字体
	ctx.textAlign = "left";     //设置对齐方式
	ctx.textBaseline = "top";   //设置对齐基准线位置
	ctx.fillText("Goblins caught: " + monstersCaught, 32, 32);//填充文本
};

// 主循环函数游戏
var main = function () {
	var now = (new Date()).getTime();//获取当前时间
	var delta = now - then;//计算两次游戏之间的时间差
	update(delta / 1000);
	render();
	then = now;
	// 立即调用主函数
	requestAnimationFrame(main);//请求动画桢，一种循环执行动画函数
};

// 浏览器兼容性处理(requestAnimationFrame) 
var w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

// 开始玩这个游戏
//var then = Date.now();//再获取当前时间
var then = (new Date()).getTime();//再获取当前时间
reset();//渲染事物
main();