const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "info",
    aliases: ["owner", "botadmin", "creator", "dev"],
    version: "2.0",
    author: "MYOUN",
    countDown: 3,
    role: 0,
    shortDescription: "Show bot owner information",
    longDescription: "Displays detailed information about the bot's creator",
    category: "info",
    guide: {
      en: "{pn} or {pn} owner"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    
    try {
      // Create beautiful information box
      const message = 
        `━━━[ OWNER DETAILS ]━━━

👤 Name : MYOUN SORKAR
👤 Gender : Male
❤️ Relation : Single
🔥 Age : 19+
🕌 Religion : Islam
🎓 Education : Third Semester (CSE)
💼 Job : Taka Mara
👑 Role : Group Owner
🏠 Address : Tangail, Bangladesh`;
      
      // Get profile picture
      const imgURL = "https://graph.facebook.com/100021922069388/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const path = __dirname + "/cache/owner_info.jpg";
      
      // Create cache directory if not exists
      const cacheDir = __dirname + "/cache";
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      // Download profile picture
      try {
        const response = await axios({
          method: "GET",
          url: imgURL,
          responseType: "arraybuffer",
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        });
        
        // Save image to cache
        fs.writeFileSync(path, Buffer.from(response.data, "binary"));
        
        // Send message with image
        await api.sendMessage({
          body: message,
          attachment: fs.createReadStream(path)
        }, threadID, messageID);
        
        // Add reaction
        api.setMessageReaction("✅", messageID, () => {}, true);
        
        // Cleanup after 5 seconds
        setTimeout(() => {
          try {
            if (fs.existsSync(path)) {
              fs.unlinkSync(path);
            }
          } catch (e) {
            console.error("Cleanup error:", e);
          }
        }, 5000);
        
      } catch (imgError) {
        console.error("Image download error:", imgError);
        
        // Send text-only message if image fails
        await api.sendMessage({
          body: message + "\n\n⚠️ Could not load profile picture"
        }, threadID, messageID);
        
        api.setMessageReaction("⚠️", messageID, () => {}, true);
      }
      
    } catch (error) {
      console.error("Info command error:", error);
      
      const errorMessage = 
        `╔═════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═════╗\n` +
        `         ❌ 𝐄𝐑𝐑𝐎𝐑\n\n` +
        `Failed to load owner information.\n\n` +
        `🔄 Please try again\n` +
        `👑 Developer: Rasel Mahmud\n` +
        `🔗 https://www.facebook.com/profile.php?id=61591685889830\n` +
        `╚═══════════════════╝`;
      
      await api.sendMessage(errorMessage, threadID, messageID);
    }
  }
};
