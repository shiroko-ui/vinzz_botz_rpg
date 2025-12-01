# 🎮 Vinzz Bot - WhatsApp RPG

Bot WhatsApp dengan fitur RPG lengkap, anti-spam system, dan fitur "Jadi Bot".

## ✨ Features

- 🎮 **RPG System** - Level, EXP, Gold, Diamond
- 🎣 **Game Commands** - Hunt, Fish, Battle
- 🏪 **Shop System** - Buy & Sell Items
- 📊 **Leaderboard** - Top Players Ranking
- 🚫 **Anti-Spam** - Cooldown & Warning System
- 🤖 **Jadi Bot** - User bisa bikin bot sendiri
- 💾 **Database** - Persistent Data Storage
- 🔌 **REST API** - HTTP Server Integration

## 🚀 Installation

### Requirements
- Node.js v14+
- npm atau yarn
- WhatsApp Account

### Setup

```bash
# Clone repository
git clone https://github.com/USERNAME/vinzz-bot.git
cd vinzz-bot

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dengan konfigurasi Anda

# Run bot
npm start
```

## 📖 Usage

### Commands

```
!help              - Lihat menu
!profile           - Lihat profil
!hunt              - Berburu
!fish              - Memancing
!shop              - Lihat toko
!buy <item> [qty]  - Beli item
!inventory         - Lihat inventory
!leaderboard [type] - Lihat ranking
!stats             - Lihat statistik
```

### Game Features

- **Hunt**: Berburu untuk mendapat EXP & Gold
- **Fish**: Memancing dengan umpan (beli di shop)
- **Battle**: Lawan musuh untuk hadiah besar
- **Shop**: Beli item, weapon, armor
- **Inventory**: Kelola item inventory
- **Leaderboard**: Lihat top players

## 📁 Project Structure

```
vinzz-bot/
├── start.js           (Entry point)
├── config.js          (Bot config)
├── settings.js        (Global settings)
├── main.js            (Main handler)
├── .env               (Environment variables)
├── package.json       (Dependencies)
├── src/
│   ├── server.js      (HTTP API server)
│   ├── databease.js   (Database management)
│   ├── antispam.js    (Anti-spam system)
│   ├── message.js     (Message helper)
│   └── jadibot.js     (Jadi Bot feature)
├── lib/
│   ├── game.js        (Game commands handler)
│   ├── function.js    (Utility functions)
│   ├── converter.js   (Format converter)
│   ├── template_menu.js (Menu templates)
│   └── ... (other utilities)
├── database/          (Game database)
│   ├── users.json
│   ├── items.json
│   └── quests.json
└── sessions/          (WhatsApp session)
```

## ⚙️ Configuration

Edit `settings.js` untuk:
- Owner & Admin JID
- Bot prefix
- RPG rewards
- Items definition
- Battle enemies
- Quests

Edit `.env` untuk:
```env
PORT=3000
NODE_ENV=production
OWNER_JID=62811xxxxxxxx@s.whatsapp.net
```

## 🔌 API Endpoints

Server berjalan di `http://localhost:3000`

### User Endpoints
- `GET /api/user/:jid` - Get user data
- `GET /api/user/:jid/stats` - Get user stats
- `POST /api/user/:jid/exp` - Add experience
- `POST /api/user/:jid/gold` - Add/spend gold

### Inventory
- `GET /api/user/:jid/inventory` - Get inventory
- `POST /api/user/:jid/inventory/add` - Add item
- `POST /api/user/:jid/inventory/remove` - Remove item

### Leaderboard
- `GET /api/leaderboard/:type` - Get leaderboard (level, gold, hunt, fish)

### Stats
- `GET /api/stats` - Get bot statistics

## 🛠️ Development

```bash
# Install dev dependencies
npm install --save-dev nodemon

# Run with auto-reload
npm run dev

# Or manually
nodemon start.js
```

## 📚 Documentation

Lihat folder `docs/` untuk dokumentasi lengkap.

## 🤝 Contributing

Pull requests welcome! Feel free to open issues.

## 📄 License

MIT License - see LICENSE file

## 👤 Author

Your Name (@username)

## ⚠️ Disclaimer

Bot ini dibuat untuk tujuan edukasi. Gunakan dengan bijak dan sesuai dengan Syarat & Ketentuan WhatsApp.

---

**Enjoy playing! 🎮**