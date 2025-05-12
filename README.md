# MailIQ – AI-powered Gmail Email Sorter & Dashboard

MailIQ is a full-stack Remix application that connects to your Gmail account, fetches your emails, and uses AI to automatically categorize, summarize, and manage them. You can link multiple Gmail accounts, bulk delete or unsubscribe, and even auto-process new emails.

---

## 🌟 Features

- Google OAuth login
- Link multiple Gmail accounts to one user
- Create custom categories for sorting emails
- Auto-categorize and summarize new emails using AI
- View categorized emails with summaries
- Bulk delete emails
- Bulk unsubscribe from marketing emails using AI & Playwright
- Fetch new emails in real-time
- Fully styled UI using TailwindCSS and responsive components

---

## 🧠 Tech Stack

- **Frontend:** React + Remix v2 + Vite
- **Backend:** Node.js + Remix loaders/actions
- **Database:** PostgreSQL (via NeonDB) + Drizzle ORM
- **Auth:** Google OAuth 2.0 (plus session cookie auth)
- **Gmail API:** For listing, archiving, deleting emails
- **AI:** OpenAI API (for categorizing and summarizing)
- **Automation:** Playwright (for auto-unsubscribe actions)
- **Deployment:** Vercel

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/mailiq.git
cd mailiq
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup .env

Create a `.env` file in the root:

```bash
# Gmail + Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://domain/auth/google/callback

# OpenAI
OPENAI_API_KEY=your_openai_key

# DB connection
DATABASE_URL=your_neondb_connection_url

# Session secret
SESSION_SECRET=somerandomsecret
```

### 4. Setup your Google project

- Go to https://console.cloud.google.com/
- Create a new project
- Enable Gmail API
- Create OAuth credentials (for web client)
- Add http://localhost:5173 or public url as redirect URIs

### 6. Start dev server

```bash
npm run dev
```

---

## 🧪 How Unsubscribe Works

- Uses Playwright to open the unsubscribe link
- Blocks images/media/fonts to speed up load
- Searches for checkboxes, buttons like "Unsubscribe", "Submit", "Stop"
- Clicks the right action and waits for confirmation

---


## 📄 Scripts

```bash
npm run dev          # Start dev server with Remix + Vite
npm run build        # Build for production
npm run start        # Start in production
```

---

## 🔐 OAuth Scopes

Your Gmail app will request:

- `https://mail.google.com/`
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.modify`
- `https://www.googleapis.com/auth/gmail.labels`
- `profile`
- `email`

Add test users to your Google Cloud OAuth consent screen.

---

## ⚙️ Architecture

- `/app/routes`: Remix routes and actions
- `/app/utils`: Core logic (AI, Gmail, unsubscribe)
- `/app/db`: Drizzle schema and NeonDB client
- `/app/components`: React UI components
- `/app/styles`: Tailwind and scrollbar CSS

---

## 🧼 Cleanup

- All deletions remove from both DB and Gmail
- When unlinking Gmail, all related labels/emails are cleaned

---

## ❓ FAQ

**Q: Can I support multiple Gmail accounts per user?**  
Yes, already built-in.

---

## 📤 Deployment

You can deploy to Fly.io, Render, or any Node-compatible host.

---

## 👨‍💻 Author

Built by [Arpit Singhal](https://www.arpitsinghal.me)

---

## 📜 License

MIT
