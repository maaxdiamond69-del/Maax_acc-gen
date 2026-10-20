const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'bot.config.json');
const STATE_FILE = path.join(__dirname, 'bot-state.json');
const PLACEHOLDER = 'PASTE_BOTFATHER_TOKEN_HERE';

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function loadToken(cfg) {
  const fromEnv = process.env.TELEGRAM_BOT_TOKEN;
  if (fromEnv && fromEnv.trim() && fromEnv.trim() !== PLACEHOLDER) return fromEnv.trim();
  const token = String(cfg.token || '').trim();
  if (!token || token === PLACEHOLDER) return '';
  return token;
}

function loadChatId(cfg) {
  const fromEnv = process.env.TELEGRAM_CHAT_ID;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  if (cfg.chatId != null && String(cfg.chatId).trim()) return String(cfg.chatId).trim();
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return saved.chatId != null ? String(saved.chatId) : null;
  } catch {
    return null;
  }
}

function saveChatId(chatId) {
  try {
    fs.writeFileSync(STATE_FILE, `${JSON.stringify({ chatId }, null, 2)}\n`);
  } catch (e) {
    console.log(`telegram state not saved: ${e.message}`);
  }
}

function attach(api) {
  const cfg = readConfig();
  const token = loadToken(cfg);
  if (!token) {
    console.log('Telegram token missing. Chat replies are off.');
    return;
  }

  let chatId = loadChatId(cfg);
  let warned = false;

  async function tg(method, body, timeoutMs = 20000) {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.description || method);
    return json.result;
  }

  async function send(target, text) {
    if (!target) return false;
    try {
      await tg('sendMessage', {
        chat_id: target,
        text: String(text).slice(0, 3500),
        disable_web_page_preview: true,
      });
      return true;
    } catch (e) {
      console.log(`telegram send failed: ${e.message}`);
      return false;
    }
  }

  api.setResultHandler(async ({ n, json, retryMs }) => {
    if (!chatId) {
      if (!warned) {
        warned = true;
        console.log('Telegram waiting for a message in the bot chat.');
      }
      return;
    }
    const parts = [api.formatResult(n, json)];
    if (!json.success && retryMs > 0) {
      parts.push(api.line('retry', `in ${Math.round(retryMs / 1000)}s`));
    }
    await send(chatId, parts.join('\n'));
  });

  async function onMessage(msg) {
    const from = msg.chat && msg.chat.id;
    if (!from) return;
    const text = String(msg.text || '').trim();
    const command = text.split(/\s+/)[0].split('@')[0].toLowerCase();

    if (chatId && String(from) !== String(chatId)) {
      await send(from, 'Ye bot private hai.');
      return;
    }

    const first = !chatId;
    if (first) {
      chatId = String(from);
      saveChatId(chatId);
      console.log(`Telegram chat ${chatId}`);
    }

    if (first || command === '/start' || command === '/status' || command === '/help' || !text.startsWith('/')) {
      await send(from, 'Bot online.\n10 sec pe 1 account is chat pe aayega.\nError pe 10-20 sec ruk ke continue.');
    }
  }

  async function pollUpdates() {
    let offset = 0;
    while (true) {
      try {
        const updates = await tg('getUpdates', {
          offset,
          timeout: 50,
          allowed_updates: ['message'],
        }, 65000);
        for (const update of updates) {
          offset = update.update_id + 1;
          if (update.message) await onMessage(update.message);
        }
      } catch (e) {
        console.log(`telegram poll error: ${e.message}`);
        await api.sleep(3000);
      }
    }
  }

  (async () => {
    try {
      await tg('deleteWebhook', { drop_pending_updates: false });
      console.log(chatId ? `Telegram chat ${chatId}` : 'Telegram online. Bot ko ek message bhejo.');
      if (chatId) await send(chatId, 'Bot online. Accounts is chat pe aayenge.');
      await pollUpdates();
    } catch (e) {
      console.log(`telegram failed: ${e.message}`);
    }
  })();
}

module.exports = { attach };
