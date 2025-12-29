let bg;
let bg2;
let bgHome; // 首頁背景

// 角色圖片
let idleImg;        // 站立（1.png）
let moveImgs = [];  // 移動動畫（2~5）

// 角色位置
let x;
let y;
const speed = 4;

// ===== 跳躍相關 =====
let velocityY = 0;
const gravity = 0.8;
const jumpPower = -14;
let onGround = true;
let groundY;

// 動畫設定
let frameIndex = 0;
const animDelay = 5;
let delayCounter = 0;

// 原始角色尺寸
const baseW = 299 / 8;
const baseH = 40;

// ⭐ 角色放大倍率
const sizeScale = 1.5;

// 實際顯示尺寸
const charW = baseW * sizeScale;
const charH = baseH * sizeScale;

// 狀態
let isMoving = false;
let facing = 1; // 1 = 右, -1 = 左

// ===== 角色2 相關 (NPC：提問者) =====
let idleImg2;
let moveImgs2 = [];
let x2, y2;
let velocityY2 = 0;
let onGround2 = true;
let facing2 = 1;
let successImgs2 = [];
let isSuccessAnim = false;
let npcVisible = true;
let successAnimIndex = 0;

// ===== 遊戲狀態 =====
let lives = 3;
let gameState = 'START'; // 'START', 'PLAY', 'GAMEOVER', 'VICTORY'

// ===== 測驗系統 =====
let table;
let table2; // 第二關題庫
let currentLevel = 1; // 目前關卡
let currentQ = "";
let currentA = "";
let isQuizActive = false;
let quizCooldown = 0;
let inputElem; // 輸入框 DOM 元素

// ===== 傳送門與場景 =====
let portalX;
let bgTint = [255, 255, 255]; // 背景染色
let npcTint = [255, 255, 255]; // NPC 染色
let flashAlpha = 0; // 轉場閃光透明度
let isTeleporting = false;
let teleportScale = 1;
let teleportAngle = 0;
let fireworks = []; // 煙火陣列
let potionImg;
let potionActive = false;
let potionX, potionY;

function preload() {
  bg = loadImage('background.png/12.png');
  bg2 = loadImage('background.png/10.png');
  bgHome = loadImage('background.png/11.png');

  idleImg = loadImage('1/1.png');

  for (let i = 2; i <= 5; i++) {
    moveImgs.push(loadImage(`1/${i}.png`));
  }

  idleImg2 = loadImage('2/3.png');
  for (let i = 3; i <= 7; i++) {
    moveImgs2.push(loadImage(`2/${i}.png`));
  }

  successImgs2.push(loadImage('2/28.png'));
  successImgs2.push(loadImage('2/29.png'));
  successImgs2.push(loadImage('2/30.png'));
  successImgs2.push(loadImage('2/34.png'));

  potionImg = loadImage('potion.png', 
    () => {}, 
    () => { potionImg = null; } // 載入失敗時設為 null，避免後續使用出錯
  );

  table = loadTable('questions.csv', 'csv', 'header');
  table2 = loadTable('questions2.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);

  // 像素風
  pixelDensity(1);
  noSmooth();

  // 初始位置
  x = width * 0.25;
  groundY = height * 0.7;
  y = groundY;

  // 角色2 初始位置 (置中靠右)
  x2 = width * 0.6; // 往前一點點
  y2 = groundY;

  // 傳送門位置 (在 NPC 右邊)
  portalX = width * 0.85;

  // 魔法瓶位置 (中間偏左，上方)
  potionX = width * 0.3;
  potionY = height * 0.7;

  // 建立隱藏的輸入框，用於接收鍵盤輸入 (包含中文)
  inputElem = createInput('');
  inputElem.position(-1000, -1000); // 移出畫面，避免遮擋
  inputElem.attribute('autocomplete', 'off'); // 關閉自動完成
}

function draw() {
  if (gameState === 'START') {
    drawStartScreen();
    return;
  }
  if (gameState === 'GAMEOVER') {
    drawGameOver();
    return;
  }
  if (gameState === 'VICTORY') {
    drawVictory();
    return;
  }

  // 繪製背景 (支援染色)
  push();
  tint(bgTint[0], bgTint[1], bgTint[2]);
  if (currentLevel === 2) {
    image(bg2, 0, 0, width, height);
  } else {
    image(bg, 0, 0, width, height);
  }
  pop();

  isMoving = false;

  // ===== 魔法瓶 (第二關) =====
  if (currentLevel === 2 && potionActive) {
    // 繪製魔法瓶
    if (potionImg && potionImg.width > 1) {
      image(potionImg, potionX, potionY, 40, 40);
    } else {
      // 圖片未載入時的替代圖形 (藍色藥水)
      push();
      noStroke();
      fill(100, 100, 255);
      ellipse(potionX + 20, potionY + 25, 30, 30); // 瓶身
      rect(potionX + 12, potionY, 16, 15); // 瓶頸
      fill(200, 50, 50);
      rect(potionX + 12, potionY - 5, 16, 5); // 瓶塞
      pop();
    }

    // 碰撞偵測
    let d = dist(x + charW / 2, y + charH / 2, potionX + 20, potionY + 20);
    if (d < 50) {
      potionActive = false;
      lives++; // 增加血量
    }
  }

  if (!isTeleporting) {
    // 左右移動
    if (keyIsDown(LEFT_ARROW)) {
      x -= speed;
      isMoving = true;
      facing = -1;
    }

    if (keyIsDown(RIGHT_ARROW)) {
      x += speed;
      isMoving = true;
      facing = 1;
    }

    x = constrain(x, 0, width - charW);

    // ===== 跳躍物理 =====
    velocityY += gravity;
    y += velocityY;

    if (y >= groundY) {
      y = groundY;
      velocityY = 0;
      onGround = true;
    }
  } else {
    // 吸入動畫邏輯
    let targetX = portalX - charW / 2;
    let targetY = (groundY - 50) + charH / 2; // 讓角色中心對準傳送門中心
    
    x = lerp(x, targetX, 0.1);
    y = lerp(y, targetY, 0.1);
    teleportScale -= 0.05;
    teleportAngle += 0.5;

    if (teleportScale <= 0.05) {
      enterPortal();
      isTeleporting = false;
      teleportScale = 1;
      teleportAngle = 0;
      y = groundY; // 重置高度
      velocityY = 0;
    }
  }

  // ===== 畫角色（放大 + 翻轉）=====
  push();
  if (isTeleporting) {
    translate(x + charW / 2, y - charH / 2); // 移至角色中心
    rotate(teleportAngle);
    scale(facing * teleportScale, teleportScale);
    image(idleImg, -charW / 2, -charH / 2, charW, charH);
  } else {
    translate(x + charW / 2, y);
    scale(facing, 1);

    if (isMoving) {
      delayCounter++;
      if (delayCounter >= animDelay) {
        frameIndex = (frameIndex + 1) % moveImgs.length;
        delayCounter = 0;
      }
      image(moveImgs[frameIndex], -charW / 2, -charH, charW, charH);
    } else {
      frameIndex = 0;
      image(idleImg, -charW / 2, -charH, charW, charH);
    }
  }
  pop();

  // 取得角色2尺寸
  let charW2 = (idleImg2 && idleImg2.width > 0) ? idleImg2.width * sizeScale : 40;
  let charH2 = (idleImg2 && idleImg2.height > 0) ? idleImg2.height * sizeScale : 60;

  if (npcVisible) {
    // 角色2 物理 (保持重力，但不移動)
    velocityY2 += gravity;
    y2 += velocityY2;
    if (y2 >= groundY) {
      y2 = groundY;
      velocityY2 = 0;
      onGround2 = true;
    }

    // 角色2 面向角色1 (動畫播放時不轉向)
    if (!isSuccessAnim) {
      if (x < x2) {
        facing2 = -1; // 面向左
      } else {
        facing2 = 1;  // 面向右
      }
    }

    // 畫角色2
    push();
    translate(x2 + charW2 / 2, y2);
    scale(facing2, 1);
    tint(npcTint[0], npcTint[1], npcTint[2]); // 依據關卡改變 NPC 顏色
    
    if (isSuccessAnim) {
      // 播放消失動畫
      if (frameCount % 10 === 0) {
        successAnimIndex++;
      }
      if (successAnimIndex < successImgs2.length) {
        image(successImgs2[successAnimIndex], -charW2 / 2, -charH2, charW2, charH2);
      } else {
        npcVisible = false; // 動畫結束，隱藏角色
        isSuccessAnim = false;
      }
    } else {
      // NPC 保持站立圖
      image(idleImg2, -charW2 / 2, -charH2, charW2, charH2);
    }
    pop();
  } else if (!isSuccessAnim && gameState === 'PLAY') {
    // NPC 消失後，顯示傳送門
    drawPortal(portalX, groundY - 50);

    // 檢測角色1是否進入傳送門
    if (!isTeleporting) {
      let d = dist(x + charW / 2, y - charH / 2, portalX, groundY - 50);
      if (d < 50) {
        isTeleporting = true;
      }
    }
  }

  // ===== 測驗邏輯 (自動觸發，不需按 Enter) =====
  if (npcVisible && !isSuccessAnim && gameState === 'PLAY') {
    let d = dist(x, y, x2, y2);
    
    // 冷卻時間遞減
    if (quizCooldown > 0) quizCooldown--;

    // 觸發測驗
    if (d < 150 && !isQuizActive && quizCooldown <= 0) {
      startQuiz();
    }

    // 測驗進行中
  }

  // 繪製對話框與互動
  drawQuizUI();
  
  // 繪製血量
  drawHearts();

  // 轉場特效 (白光淡出)
  if (flashAlpha > 0) {
    noStroke();
    fill(255, flashAlpha);
    rect(0, 0, width, height);
    flashAlpha -= 10;
  }
}

function startQuiz() {
  let r = floor(random(table.getRowCount()));
  currentQ = table.getString(r, 'question');
  currentA = table.getString(r, 'answer');
  
  isQuizActive = true;
  inputElem.value('');
  inputElem.elt.focus();
}

// 繪製對話框系統
function drawQuizUI() {
  if (isQuizActive) {
    // 1. NPC 顯示題目 + 倒數計時
    let npcText = currentQ;
    drawBubble(x2 + 20, y2 - 70, npcText, false);

    // 2. 玩家顯示輸入框氣泡
    let playerText = inputElem.value();
    if (frameCount % 60 < 30) {
      playerText += "|"; // 模擬游標閃爍
    }
    drawBubble(x + 20, y - 70, playerText, true);
  }
}

// 通用對話框函數 (自動調整大小)
function drawBubble(targetX, targetY, txt, isPlayer) {
  push();
  textSize(12); // 字體改小
  textLeading(16); // 設定行距
  let maxW = 200; // 氣泡最大寬度
  let padding = 15;
  
  // 手動計算換行以取得正確高度，防止超出框線
  let lines = [];
  let paragraphs = txt.split('\n');
  
  for (let para of paragraphs) {
    let currentLine = "";
    for (let i = 0; i < para.length; i++) {
      let char = para[i];
      // 檢查加入此字元後是否超過最大寬度 (預留 padding)
      if (textWidth(currentLine + char) < maxW - padding * 2) {
        currentLine += char;
      } else {
        lines.push(currentLine);
        currentLine = char;
      }
    }
    lines.push(currentLine);
  }
  
  // 計算氣泡寬度與高度
  let boxW = 0;
  if (lines.length > 1) {
    boxW = maxW; // 多行時使用最大寬度
  } else {
    boxW = textWidth(lines[0]) + padding * 2; // 單行時依文字寬度
    boxW = max(boxW, 60); // 設定最小寬度
  }
  
  let lineHeight = 16;
  let boxH = lines.length * lineHeight + padding * 2;
  
  // 氣泡位置 (targetY 為氣泡底部尖端位置)
  let bX = targetX;
  let bY = targetY - boxH - 10;

  // 畫氣泡本體
  fill(255);
  stroke(0);
  strokeWeight(2);
  rectMode(CORNER);
  rect(bX - boxW/2, bY, boxW, boxH, 10);
  
  // 畫尖角
  if (isPlayer) {
    triangle(bX, bY + boxH, bX + 10, bY + boxH, bX + 5, bY + boxH + 10);
  } else {
    triangle(bX - 10, bY + boxH, bX, bY + boxH, bX - 5, bY + boxH + 10);
  }

  // 畫文字
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  
  // 組合處理過的文字 (確保換行與計算一致)
  let finalTxt = lines.join('\n');
  text(finalTxt, bX - boxW/2, bY, boxW, boxH);
  
  pop();
}

// 繪製愛心
function drawHearts() {
  push();
  fill(255, 0, 0);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(30);
  let hearts = "";
  for (let i = 0; i < lives; i++) {
    hearts += "♥ ";
  }
  // 補上空心 (可選，這裡只顯示剩餘血量)
  text(hearts, width / 2, 20);
  pop();
}

// 繪製 Game Over
function drawGameOver() {
  background(0);
  
  // 紅色字閃爍效果
  let flicker = random(150, 255);
  fill(255, 0, 0, flicker);
  
  textAlign(CENTER, CENTER);
  textSize(60);
  text("GAME OVER", width / 2, height / 2 - 60);
  
  // 裂成兩半的心
  textSize(80);
  text("💔", width / 2, height / 2 + 20);

  // ===== 按鈕 =====
  let btnW = 140;
  let btnH = 40;
  let gap = 20;
  let btnY = height * 0.7;
  let totalW = btnW * 2 + gap;
  let startX = width / 2 - totalW / 2;
  
  let homeX = startX;
  let restartX = startX + btnW + gap;
  
  let isHovering = false;

  stroke(255); // 改為白色邊框，在黑色背景才看得到
  strokeWeight(3);

  // 回到首頁按鈕
  if (mouseX > homeX && mouseX < homeX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
    fill(255, 240, 100);
    isHovering = true;
  } else {
    fill(255, 215, 0);
  }
  rect(homeX, btnY, btnW, btnH, 15);
  fill(0);
  noStroke();
  textSize(20);
  text("回到首頁", homeX + btnW / 2, btnY + btnH / 2 + 2);

  stroke(255); // 重設邊框
  strokeWeight(3);

  // 重新開始按鈕
  if (mouseX > restartX && mouseX < restartX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
    fill(255, 240, 100);
    isHovering = true;
  } else {
    fill(255, 215, 0);
  }
  rect(restartX, btnY, btnW, btnH, 15);
  fill(0);
  noStroke();
  textSize(20);
  text("重新開始", restartX + btnW / 2, btnY + btnH / 2 + 2);

  if (isHovering) {
    cursor(HAND);
  } else {
    cursor(ARROW);
  }
}

// 繪製首頁
function drawStartScreen() {
  image(bgHome, 0, 0, width, height);
  
  // 創作者 (左下角)
  push();
  textAlign(LEFT, BOTTOM);
  fill(255);
  stroke(0);
  strokeWeight(2);
  textSize(14); // 創作者字體縮小
  text("創作者: 414730266 留妍瑜", 10, height - 10);
  pop();

  textAlign(CENTER, CENTER);
  
  // 大標
  fill(255);
  stroke(0);
  strokeWeight(5); // 加粗邊框讓文字更清楚
  textSize(45); // 大標縮小
  text("小精靈程式旅遊記", width / 2, height * 0.3); // 設在正中間偏上 (天空位置)
  
  // 小標 (規則) - 集中在沒有背景圖案的位置
  textSize(16);
  strokeWeight(3);
  text("遊戲規則：使用左右鍵移動，上鍵跳躍\n靠近 NPC 自動觸發問答，輸入答案後按 Enter 送出", width / 2, height * 0.48);
  
  // 開始遊戲按鈕
  let btnW = 120;
  let btnH = 35;
  let btnX = width / 2 - btnW / 2;
  let btnY = height * 0.58;

  if (mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
    fill(255, 240, 100); // 滑鼠移入變亮
    cursor(HAND);
  } else {
    fill(255, 215, 0);
    cursor(ARROW);
  }

  rect(btnX, btnY, btnW, btnH, 15); 
  fill(0);
  noStroke();
  textSize(18);
  text("開始遊戲", width / 2, btnY + btnH / 2 + 2);
}

function drawVictory() {
  background(0);
  
  // ===== 煙火特效 =====
  if (random(1) < 0.05) { // 每一幀有 5% 機率產生新煙火
    fireworks.push(new Firework());
  }
  for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].update();
    fireworks[i].show();
    if (fireworks[i].done()) {
      fireworks.splice(i, 1);
    }
  }

  // 金色字閃爍效果
  let flicker = random(200, 255);
  fill(255, 215, 0, flicker);
  
  textAlign(CENTER, CENTER);
  textSize(60);
  text("YOU WIN!", width / 2, height / 2 - 60);
  
  // 獎盃
  textSize(80);
  text("🏆", width / 2, height / 2 + 20);
  
  // ===== 按鈕 =====
  let btnW = 140;
  let btnH = 40;
  let gap = 20;
  let btnY = height * 0.7;
  let totalW = btnW * 2 + gap;
  let startX = width / 2 - totalW / 2;
  
  let homeX = startX;
  let restartX = startX + btnW + gap;
  
  let isHovering = false;

  stroke(255); // 改為白色邊框
  strokeWeight(3);

  // 回到首頁按鈕
  if (mouseX > homeX && mouseX < homeX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
    fill(255, 240, 100);
    isHovering = true;
  } else {
    fill(255, 215, 0);
  }
  rect(homeX, btnY, btnW, btnH, 15);
  fill(0);
  noStroke();
  textSize(20);
  text("回到首頁", homeX + btnW / 2, btnY + btnH / 2 + 2);

  stroke(255); // 重設邊框
  strokeWeight(3);

  // 重新開始按鈕
  if (mouseX > restartX && mouseX < restartX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
    fill(255, 240, 100);
    isHovering = true;
  } else {
    fill(255, 215, 0);
  }
  rect(restartX, btnY, btnW, btnH, 15);
  fill(0);
  noStroke();
  textSize(20);
  text("重新開始", restartX + btnW / 2, btnY + btnH / 2 + 2);

  if (isHovering) {
    cursor(HAND);
  } else {
    cursor(ARROW);
  }
}

function resetGame() {
  lives = 3;
  gameState = 'PLAY';
  npcVisible = true;
  isSuccessAnim = false;
  isQuizActive = false;
  quizCooldown = 0;
  x = width * 0.25;
  table = loadTable('questions.csv', 'csv', 'header'); // 重置回第一題庫
  bgTint = [255, 255, 255]; // 重置背景顏色
  npcTint = [255, 255, 255];
  currentLevel = 1;
  fireworks = []; // 清空煙火
  groundY = height * 0.7; // 重置回第一關地面高度
  y = groundY;
  x2 = width * 0.6;
  y2 = groundY;
  potionActive = false;
}

// 繪製傳送門
function drawPortal(px, py) {
  push();
  translate(px, py);
  
  // 漩渦效果
  noStroke();
  for (let i = 0; i < 5; i++) {
    fill(random(100, 200), 0, random(200, 255), 150);
    let s = 80 - i * 10 + sin(frameCount * 0.1 + i) * 10;
    ellipse(0, 0, s * 0.6, s);
  }
  
  // 核心
  fill(255);
  ellipse(0, 0, 20, 40);
  
  // 粒子
  fill(255, 255, 0);
  rect(random(-20, 20), random(-40, 40), 4, 4);
  
  pop();
}

// 進入傳送門邏輯
function enterPortal() {
  flashAlpha = 255; // 觸發閃光
  
  if (currentLevel === 2) {
    gameState = 'VICTORY';
    return;
  }

  // 隨機變換背景顏色 (模擬不同場景)
  bgTint = [random(50, 255), random(50, 255), random(50, 255)];
  x = width * 0.1; // 傳送回左側

  // ===== 進入第二關邏輯 =====
  if (currentLevel === 1) {
    currentLevel = 2;
    table = table2; // 切換為第二組題目
    npcVisible = true; // NPC 重生
    isSuccessAnim = false;
    npcTint = [255, 100, 100]; // 將新 NPC 染成紅色
    x2 = width * 0.7; // 設定新 NPC 位置
    bgTint = [255, 255, 255]; // 第二關使用新圖片，不需隨機染色
    groundY = height * 0.88; // 第二關地面較低，調整高度
    y2 = groundY; // 更新 NPC 高度
    potionActive = true; // 啟用魔法瓶
    // 設定魔法瓶高度為跳躍最高點
    let maxJump = (jumpPower * jumpPower) / (2 * gravity);
    potionY = groundY - maxJump - 10; // 設定在跳躍頂點附近
  }
}

// 鍵盤控制
function keyPressed() {
  // 角色1 跳躍
  if (keyCode === UP_ARROW && onGround) {
    velocityY = jumpPower;
    onGround = false;
  }

  // 首頁開始遊戲
  if (gameState === 'START' && keyCode === ENTER) {
    gameState = 'PLAY';
  }

  // 提交答案
  if (isQuizActive && keyCode === ENTER) {
    let userAns = inputElem.value().trim();
    
    if (userAns === currentA) {
      // 答對
      isQuizActive = false;
      isSuccessAnim = true;
      successAnimIndex = 0;
    } else {
      // 答錯
      lives--;
      isQuizActive = false;
      quizCooldown = 60; // 避免立刻重複觸發
      
      if (lives <= 0) {
        gameState = 'GAMEOVER';
      }
    }
    inputElem.value('');
    inputElem.elt.blur();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (currentLevel === 2) {
    groundY = height * 0.88;
    let maxJump = (jumpPower * jumpPower) / (2 * gravity);
    potionY = groundY - maxJump - 10;
  } else {
    groundY = height * 0.7;
    potionY = height * 0.7;
  }
  potionX = width * 0.3;
  noSmooth();
}

function mousePressed() {
  // 首頁點擊按鈕開始
  if (gameState === 'START') {
    // 檢查是否點擊到按鈕範圍 (寬120, 高35, 位置在 width/2 - 60, height*0.58)
    if (mouseX > width / 2 - 60 && mouseX < width / 2 + 60 && mouseY > height * 0.58 && mouseY < height * 0.58 + 35) {
      gameState = 'PLAY';
      cursor(ARROW); // 恢復游標
    }
  }

  // 勝利畫面按鈕
  if (gameState === 'VICTORY') {
    let btnW = 140;
    let btnH = 40;
    let gap = 20;
    let btnY = height * 0.7;
    let totalW = btnW * 2 + gap;
    let startX = width / 2 - totalW / 2;
    
    // 回到首頁
    if (mouseX > startX && mouseX < startX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
      resetGame();
      gameState = 'START';
      cursor(ARROW);
    }
    // 重新開始
    if (mouseX > startX + btnW + gap && mouseX < startX + btnW + gap + btnW && mouseY > btnY && mouseY < btnY + btnH) {
      resetGame();
      cursor(ARROW);
    }
  }

  // Game Over 畫面按鈕
  if (gameState === 'GAMEOVER') {
    let btnW = 140;
    let btnH = 40;
    let gap = 20;
    let btnY = height * 0.7;
    let totalW = btnW * 2 + gap;
    let startX = width / 2 - totalW / 2;
    
    // 回到首頁
    if (mouseX > startX && mouseX < startX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
      resetGame();
      gameState = 'START';
      cursor(ARROW);
    }
    // 重新開始
    if (mouseX > startX + btnW + gap && mouseX < startX + btnW + gap + btnW && mouseY > btnY && mouseY < btnY + btnH) {
      resetGame();
      cursor(ARROW);
    }
  }
}

// ===== 煙火類別 =====
class Firework {
  constructor() {
    this.hu = random(255); // 隨機顏色 (HSB 色相)
    this.firework = new Particle(random(width), height, this.hu, true);
    this.exploded = false;
    this.particles = [];
  }

  done() {
    return this.exploded && this.particles.length === 0;
  }

  update() {
    if (!this.exploded) {
      this.firework.applyForce(createVector(0, 0.2)); // 重力
      this.firework.update();
      if (this.firework.vel.y >= 0) {
        this.exploded = true;
        this.explode();
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].applyForce(createVector(0, 0.2));
      this.particles[i].update();
      if (this.particles[i].done()) {
        this.particles.splice(i, 1);
      }
    }
  }

  explode() {
    for (let i = 0; i < 100; i++) {
      let p = new Particle(this.firework.pos.x, this.firework.pos.y, this.hu, false);
      this.particles.push(p);
    }
  }

  show() {
    if (!this.exploded) {
      this.firework.show();
    }
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].show();
    }
  }
}

class Particle {
  constructor(x, y, hu, firework) {
    this.pos = createVector(x, y);
    this.firework = firework;
    this.lifespan = 255;
    this.hu = hu;
    this.acc = createVector(0, 0);
    if (this.firework) {
      this.vel = createVector(0, random(-18, -10)); // 上升速度
    } else {
      this.vel = p5.Vector.random2D();
      this.vel.mult(random(2, 10)); // 爆炸擴散速度
    }
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    if (!this.firework) {
      this.vel.mult(0.9); // 空氣阻力
      this.lifespan -= 4; // 消失速度
    }
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  show() {
    colorMode(HSB, 255); // 切換到 HSB 模式以顯示鮮豔顏色
    if (!this.firework) {
      strokeWeight(4); // 粒子大小
      stroke(this.hu, 255, 255, this.lifespan);
    } else {
      strokeWeight(6); // 發射點大小
      stroke(this.hu, 255, 255);
    }
    point(this.pos.x, this.pos.y);
    colorMode(RGB, 255); // 切換回 RGB 模式以免影響其他繪圖
  }

  done() {
    return this.lifespan < 0;
  }
}
