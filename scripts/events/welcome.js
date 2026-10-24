
const { drive } = global.utils;
const { nickNameBot } = global.GoatBot.config;
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "welcome",
    version: "8.1",
    author: "Myoun",
    category: "events"
  },

  langs: {
    en: {
      defaultWelcomeMessage:
        "╭───────୨♡୧───────╮\n\n" +
        "🎀 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 {userName}! 💗\n\n" +
        "🌸 আমাদের ছোট্ট পরিবারে\n" +
        "তোমাকে স্বাগতম! 🫶🏻\n\n" +
        "📍 𝗬𝗢𝗨 𝗔𝗥𝗘 𝗜𝗡\n" +
        "「 {threadName} 」\n\n" +
        "💕 তোমার উপস্থিতিতে গ্রুপটি\n" +
        "আরও সুন্দর হোক! 🌷\n\n" +
        "💌 𝗠𝗬 𝗢𝗙𝗙𝗜𝗖𝗜𝗔𝗟 𝗚𝗥𝗢𝗨𝗣\n" +
        "🎀 𝗖𝗨𝗧𝗘 𝗕𝗔𝗥𝗥𝗬 🎀\n\n" +
        "👑 𝗕𝗢𝗧 𝗢𝗪𝗡𝗘𝗥 : 𝗠𝗬𝗢𝗨𝗡\n" +
        "♡ 𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 𝗠𝗬𝗢𝗨𝗡 ♡\n\n" +
        "╰───────୨♡୧───────╯",

      botAddedMessage:
        "╭───────୨♡୧───────╮\n\n" +
        "🎀 𝗛𝗘𝗟𝗟𝗢, 𝗕𝗘𝗔𝗨𝗧𝗜𝗘𝗦! 💗\n\n" +
        "🤖 আমাকে এই গ্রুপে অ্যাড করার জন্য\n" +
        "ধন্যবাদ! 🫶🏻🌸\n\n" +
        "📍 𝗧𝗛𝗜𝗦 𝗚𝗥𝗢𝗨𝗣\n" +
        "「 {threadName} 」\n\n" +
        "⚙️ 𝗛𝗘𝗟𝗣 : {prefix}help\n\n" +
        "💌 𝗠𝗬 𝗢𝗙𝗙𝗜𝗖𝗜𝗔𝗟 𝗚𝗥𝗢𝗨𝗣\n" +
        "🎀 𝗖𝗨𝗧𝗘 𝗕𝗔𝗥𝗥𝗬 🎀\n\n" +
        "💕 আমাদের গ্রুপেও ঘুরে আসতে পারেন!\n\n" +
        "👑 𝗕𝗢𝗧 𝗢𝗪𝗡𝗘𝗥 : 𝗠𝗬𝗢𝗨𝗡\n" +
        "♡ 𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 𝗠𝗬𝗢𝗨𝗡 ♡\n\n" +
        "╰───────୨♡୧───────╯"
    }
  },

  onStart: async ({
    threadsData, message, event, api, usersData, getLang
  }) => {
    if (event.logMessageType !== "log:subscribe") return;

    const { threadID } = event;
    const threadData = await threadsData.get(threadID);

    if (!threadData.settings.sendWelcomeMessage) return;

    const addedMembers = event.logMessageData.addedParticipants || [];
    const threadName = threadData.threadName || "Our Group";
    const inviterID = event.author;
    const prefix = global.utils.getPrefix(threadID);
    const botID = api.getCurrentUserID();

    for (const user of addedMembers) {
      const userID = user.userFbId;

      if (userID == botID) {
        if (nickNameBot) {
          await api.changeNickname(nickNameBot, threadID, botID);
        }

        const botMessage = getLang("botAddedMessage")
          .replace(/\{threadName\}/g, threadName)
          .replace(/\{prefix\}/g, prefix);

        await message.send(botMessage);
        continue;
      }

      const userName = user.fullName || "New Member";
      const inviterName = inviterID
        ? await usersData.getName(inviterID)
        : "Unknown";

      const memberCount = (event.participantIDs || []).length;

      let { welcomeMessage = getLang("defaultWelcomeMessage") } =
        threadData.data || {};

      welcomeMessage = welcomeMessage
        .replace(/\{userName\}/g, userName)
        .replace(/\{userTag\}/g, userName)
        .replace(/\{threadName\}/g, threadName)
        .replace(/\{memberCount\}/g, memberCount)
        .replace(/\{inviterName\}/g, inviterName || "Unknown");

      let welcomeImagePath = null;

      try {
        welcomeImagePath = await createWelcomeCard({
          userName,
          threadName,
          memberCount,
          inviterName: inviterName || "Unknown",
          newUserID: userID,
          inviterID,
          threadID,
          api
        });
      } catch (err) {
        console.error("[Myoun Welcome] Image error:", err);
      }

      const form = {
        body: welcomeMessage,
        mentions: [{ tag: userName, id: userID }]
      };

      if (welcomeImagePath && await fs.pathExists(welcomeImagePath)) {
        form.attachment = fs.createReadStream(welcomeImagePath);
      } else if (
        threadData.data &&
        threadData.data.welcomeAttachment
      ) {
        const attachments = threadData.data.welcomeAttachment.map(
          file => drive.getFile(file, "stream")
        );

        const results = await Promise.allSettled(attachments);

        form.attachment = results
          .filter(result => result.status === "fulfilled")
          .map(result => result.value);
      }

      await message.send(form);

      if (welcomeImagePath) {
        setTimeout(() => {
          fs.unlink(welcomeImagePath).catch(() => {});
        }, 10000);
      }
    }
  }
};

// Keep the Facebook access token in your environment configuration.
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN || "";

async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000
    });

    return Buffer.from(response.data);
  } catch {
    return null;
  }
}

async function downloadHighQualityProfile(userID) {
  if (ACCESS_TOKEN) {
    const url =
      `https://graph.facebook.com/${userID}/picture` +
      `?width=500&height=500&access_token=${ACCESS_TOKEN}`;

    const image = await downloadImage(url);
    if (image) return image;
  }

  return null;
}

async function getGroupImage(threadID, api) {
  try {
    const info = await api.getThreadInfo(threadID);

    if (info.imageSrc) {
      return await downloadImage(info.imageSrc);
    }
  } catch {
    console.error("[Myoun Welcome] Group image unavailable.");
  }

  return null;
}

function unicodeToPlain(str) {
  if (!str) return "";

  const ranges = [
    [0x1D400, 0x1D419, "A"],
    [0x1D41A, 0x1D433, "a"],
    [0x1D434, 0x1D44D, "A"],
    [0x1D44E, 0x1D467, "a"],
    [0x1D468, 0x1D481, "A"],
    [0x1D482, 0x1D49B, "a"],
    [0x1D5D4, 0x1D5ED, "A"],
    [0x1D5EE, 0x1D607, "a"],
    [0x1D63C, 0x1D655, "A"],
    [0x1D656, 0x1D66F, "a"],
    [0x1D7CE, 0x1D7D7, "0"],
    [0xFF21, 0xFF3A, "A"],
    [0xFF41, 0xFF5A, "a"],
    [0xFF10, 0xFF19, "0"]
  ];

  let result = "";

  for (const char of str) {
    const cp = char.codePointAt(0);
    let converted = false;

    for (const [start, end, base] of ranges) {
      if (cp >= start && cp <= end) {
        result += String.fromCodePoint(
          base.codePointAt(0) + cp - start
        );
        converted = true;
        break;
      }
    }

    if (!converted) result += char;
  }

  return result;
}

function readableText(str) {
  return unicodeToPlain(String(str || ""));
}

function ordinal(n) {
  const value = Number(n) || 0;

  if (value % 100 >= 11 && value % 100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1: return `${value}st`;
    case 2: return `${value}nd`;
    case 3: return `${value}rd`;
    default: return `${value}th`;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCircleAvatar(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

function fitText(ctx, text, maxWidth, maxSize = 34, minSize = 14) {
  const original = String(text || "");
  let output = original;
  let size = maxSize;

  ctx.font = `bold ${size}px Arial`;

  while (ctx.measureText(output).width > maxWidth && size > minSize) {
    size--;
    ctx.font = `bold ${size}px Arial`;
  }

  while (
    ctx.measureText(output).width > maxWidth &&
    output.length > 1
  ) {
    output = output.slice(0, -1);
  }

  if (output !== original) {
    while (
      ctx.measureText(output + "…").width > maxWidth &&
      output.length > 1
    ) {
      output = output.slice(0, -1);
    }
    output += "…";
  }

  return { text: output, size };
}

async function createWelcomeCard({
  userName,
  threadName,
  memberCount,
  inviterName,
  newUserID,
  inviterID,
  threadID,
  api
}) {
  const W = 1200;
  const H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  async function loadProfile(uid) {
    if (!uid) return null;

    let buffer = await downloadHighQualityProfile(uid);

    if (!buffer) {
      try {
        const info = await api.getUserInfo([uid]);
        const url = info[uid]?.thumbSrc;

        if (url) buffer = await downloadImage(url);
      } catch {}
    }

    if (!buffer) return null;

    try {
      return await loadImage(buffer);
    } catch {
      return null;
    }
  }

  const [newUserImg, inviterImg, groupBuffer] = await Promise.all([
    loadProfile(newUserID),
    loadProfile(inviterID),
    getGroupImage(threadID, api)
  ]);

  let groupImg = null;

  if (groupBuffer) {
    try {
      groupImg = await loadImage(groupBuffer);
    } catch {}
  }

  const safeUser = readableText(userName);
  const safeInviter = readableText(inviterName);
  const safeGroup = readableText(threadName);

  // Cute pink aesthetic background
  ctx.fillStyle = "#170b17";
  ctx.fillRect(0, 0, W, H);

  const splitX = 462;
  const PAD = 44;
  const rightEdge = W - PAD;

  ctx.fillStyle = "#21101f";
  ctx.fillRect(0, 0, splitX, H);

  const backgroundGlow = ctx.createRadialGradient(
    900, 250, 0, 900, 250, 500
  );

  backgroundGlow.addColorStop(0, "rgba(255,90,180,0.22)");
  backgroundGlow.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = backgroundGlow;
  ctx.fillRect(splitX, 0, W - splitX, H);

  // Pink outer frame
  ctx.save();
  ctx.shadowColor = "rgba(255,105,180,0.45)";
  ctx.shadowBlur = 22;
  ctx.strokeStyle = "rgba(255,145,205,0.85)";
  ctx.lineWidth = 2;
  roundRect(ctx, 7, 7, W - 14, H - 14, 22);
  ctx.stroke();
  ctx.restore();

  // Center divider
  const divider = ctx.createLinearGradient(0, 70, 0, 570);
  divider.addColorStop(0, "rgba(255,120,195,0)");
  divider.addColorStop(0.5, "rgba(255,120,195,0.9)");
  divider.addColorStop(1, "rgba(255,120,195,0)");

  ctx.fillStyle = divider;
  ctx.fillRect(splitX - 2, 60, 4, H - 120);

  // Left section
  const leftCX = splitX / 2;
  const avatarR = 115;
  const avatarY = 270;

  ctx.textAlign = "center";
  ctx.font = "bold 18px Arial";
  ctx.fillStyle = "#ff9ed6";
  ctx.fillText("♡ N E W   M E M B E R ♡", leftCX, 54);

  ctx.save();
  ctx.shadowColor = "rgba(255,105,180,0.7)";
  ctx.shadowBlur = 25;
  ctx.strokeStyle = "#ff91ce";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(leftCX, avatarY, avatarR + 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(leftCX, avatarY, avatarR + 17, 0, Math.PI * 2);
  ctx.stroke();

  if (newUserImg) {
    drawCircleAvatar(ctx, newUserImg, leftCX, avatarY, avatarR);
  } else {
    ctx.fillStyle = "#35172f";
    ctx.beginPath();
    ctx.arc(leftCX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffb4df";
    ctx.font = "bold 70px Arial";
    ctx.fillText("♡", leftCX, avatarY + 24);
  }

  const fittedUser = fitText(ctx, safeUser, splitX - 40, 34, 15);

  ctx.font = `bold ${fittedUser.size}px Arial`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(fittedUser.text, leftCX, avatarY + avatarR + 48);

  const badgeText = `♡  ${ordinal(memberCount)} Member  ♡`;

  ctx.font = "bold 17px Arial";
  const badgeW = Math.min(
    ctx.measureText(badgeText).width + 36,
    splitX - 40
  );

  const badgeX = leftCX - badgeW / 2;
  const badgeY = 455;

  const badgeGradient = ctx.createLinearGradient(
    badgeX, 0, badgeX + badgeW, 0
  );

  badgeGradient.addColorStop(0, "rgba(255,120,195,0.06)");
  badgeGradient.addColorStop(0.5, "rgba(255,120,195,0.22)");
  badgeGradient.addColorStop(1, "rgba(255,120,195,0.06)");

  ctx.fillStyle = badgeGradient;
  roundRect(ctx, badgeX, badgeY, badgeW, 42, 14);
  ctx.fill();

  ctx.strokeStyle = "#ff91ce";
  ctx.lineWidth = 1.5;
  roundRect(ctx, badgeX, badgeY, badgeW, 42, 14);
  ctx.stroke();

  ctx.fillStyle = "#ffb4df";
  ctx.fillText(badgeText, leftCX, badgeY + 27);

  // Right heading
  const rX = splitX + PAD;

  ctx.textAlign = "left";
  ctx.font = "bold 39px Arial";

  const heading = fitText(
    ctx, "Welcome To Our Group", W - rX - PAD, 39, 22
  );

  const headingGradient = ctx.createLinearGradient(
    rX, 0, rightEdge, 0
  );

  headingGradient.addColorStop(0, "#ffffff");
  headingGradient.addColorStop(1, "#ff9ed6");

  ctx.fillStyle = headingGradient;
  ctx.fillText(heading.text, rX, 88);

  ctx.strokeStyle = "#ff91ce";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(rX, 108);
  ctx.lineTo(rX + 135, 108);
  ctx.stroke();

  // Current group section
  ctx.font = "bold 13px Arial";
  ctx.fillStyle = "#ff9ed6";
  ctx.fillText("♡ G R O U P ♡", rX, 154);

  const groupX = rX;
  const groupY = 174;
  const groupSize = 90;

  ctx.save();
  roundRect(ctx, groupX, groupY, groupSize, groupSize, 15);
  ctx.clip();

  if (groupImg) {
    ctx.drawImage(groupImg, groupX, groupY, groupSize, groupSize);
  } else {
    ctx.fillStyle = "#35172f";
    ctx.fillRect(groupX, groupY, groupSize, groupSize);
    ctx.fillStyle = "#ffffff";
    ctx.font = "42px Arial";
    ctx.textAlign = "center";
    ctx.fillText("♡", groupX + groupSize / 2, groupY + 60);
  }

  ctx.restore();

  ctx.strokeStyle = "rgba(255,145,206,0.9)";
  ctx.lineWidth = 2;
  roundRect(ctx, groupX, groupY, groupSize, groupSize, 15);
  ctx.stroke();

  const groupTextX = groupX + groupSize + 20;
  const groupTextWidth = rightEdge - groupTextX;

  const fittedGroup = fitText(
    ctx, safeGroup, groupTextWidth, 32, 14
  );

  ctx.font = `bold ${fittedGroup.size}px Arial`;
  ctx.fillStyle = "#fff0f8";
  ctx.textAlign = "left";
  ctx.fillText(
    fittedGroup.text,
    groupTextX,
    groupY + groupSize / 2 + fittedGroup.size / 3
  );

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rX, 284);
  ctx.lineTo(rightEdge, 284);
  ctx.stroke();

  // Inviter section
  ctx.font = "bold 13px Arial";
  ctx.fillStyle = "#ffc6e7";
  ctx.fillText("A D D E D   B Y", rX, 315);

  const inviterR = 48;
  const inviterCX = rX + inviterR;
  const inviterCY = 385;

  ctx.save();
  ctx.shadowColor = "rgba(255,145,206,0.45)";
  ctx.shadowBlur = 15;
  ctx.strokeStyle = "#ffb4df";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(inviterCX, inviterCY, inviterR + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (inviterImg) {
    drawCircleAvatar(ctx, inviterImg, inviterCX, inviterCY, inviterR);
  } else {
    ctx.fillStyle = "#35172f";
    ctx.beginPath();
    ctx.arc(inviterCX, inviterCY, inviterR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffb4df";
    ctx.textAlign = "center";
    ctx.font = "bold 34px Arial";
    ctx.fillText("♡", inviterCX, inviterCY + 12);
  }

  const inviterTextX = inviterCX + inviterR + 18;
  const inviterWidth = rightEdge - inviterTextX;

  const fittedInviter = fitText(
    ctx, safeInviter, inviterWidth, 30, 14
  );

  ctx.textAlign = "left";
  ctx.font = `bold ${fittedInviter.size}px Arial`;
  ctx.fillStyle = "#fff0f8";
  ctx.fillText(
    fittedInviter.text,
    inviterTextX,
    inviterCY + fittedInviter.size / 3
  );

  // Welcome panel
  const panelX = rX;
  const panelY = 455;
  const panelW = rightEdge - rX;
  const panelH = 105;

  const panelGradient = ctx.createLinearGradient(
    panelX, panelY, panelX + panelW, panelY + panelH
  );

  panelGradient.addColorStop(0, "rgba(255,255,255,0.07)");
  panelGradient.addColorStop(1, "rgba(255,90,180,0.12)");

  ctx.fillStyle = panelGradient;
  roundRect(ctx, panelX, panelY, panelW, panelH, 16);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,145,206,0.55)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, panelX, panelY, panelW, panelH, 16);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "bold 23px Arial";

  const welcomeTitle = fitText(
    ctx,
    `Welcome ${safeUser}`,
    panelW - 28,
    23,
    14
  );

  ctx.fillStyle = "#ffffff";
  ctx.fillText(welcomeTitle.text, panelX + panelW / 2, panelY + 37);

  ctx.font = "16px Arial";
  ctx.fillStyle = "#ffe2f2";

  const subtitle = "Enjoy your stay and make great memories!";

  const fittedSubtitle = fitText(
    ctx, subtitle, panelW - 24, 16, 11
  );

  ctx.font = `400 ${fittedSubtitle.size}px Arial`;
  ctx.fillText(
    fittedSubtitle.text,
    panelX + panelW / 2,
    panelY + 70
  );

  // Myoun branding
  const footerY = 594;

  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";

  const brandText = "♡ Powered By Myoun ♡";
  const brandWidth = ctx.measureText(brandText).width + 48;
  const brandX = (W - brandWidth) / 2;

  const brandGradient = ctx.createLinearGradient(
    brandX, 0, brandX + brandWidth, 0
  );

  brandGradient.addColorStop(0, "#ff6eb8");
  brandGradient.addColorStop(0.5, "#ffc1e4");
  brandGradient.addColorStop(1, "#ff6eb8");

  ctx.strokeStyle = brandGradient;
  ctx.lineWidth = 2.5;
  roundRect(ctx, brandX, footerY - 27, brandWidth, 48, 24);
  ctx.stroke();

  ctx.fillStyle = brandGradient;
  ctx.fillText(brandText, W / 2, footerY + 4);

  const tempPath = path.join(
    __dirname,
    `temp_welcome_${Date.now()}.png`
  );

  await fs.writeFile(tempPath, canvas.toBuffer("image/png"));

  return tempPath;
}
