const fs = require('fs');
const path = require('path');
const {
  start,
  setResultHandler,
  formatResult,
  line,
  sleep,
  DEFAULT_REGION,
} = require('./api/register.js');

const CONFIG_FILE = path.join(__dirname, 'bot.config.json');
const STATE_FILE = path.join(__dirname, 'bot-state.json');
const PLACEHOLDER = 'PASTE_BOTFATHER_TOKEN_HERE';

function loadConfig() {
  const cfg = { token: '', region: DEFAULT_REGION };
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim() !== PLACEHOLDER) {
    cfg.token = process.env.TELEGRAM_BOT_TOKEN.trim();
  }
  if (!fs.existsSync(CONFIG_FILE)) return cfg;
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (!cfg.token) {
      const token = String(saved.token || '').trim();
      if (token && token !== PLACEHOLDER) cfg.token = token;
    }
    if (saved.region) cfg.region = String(saved.region).toUpperCase();
  } catch { /* token stays empty */ }
  return cfg;
}

function loadChatId() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return saved.chatId ?? null;
  } catch {
    return null;
  }
}

function saveChatId(chatId) {
  fs.writeFileSync(STATE_FILE, `${JSON.stringify({ chatId }, null, 2)}\n`);
}

const config = loadConfig();
if (!config.token) {
  console.log('Bot token missing.');
  console.log(`Open ${CONFIG_FILE}`);
  console.log('Paste the token from @BotFather, save, then run start-bot.bat again.');
  process.exit(0);
}

let chatId = loadChatId();

async function tg(method, body, timeoutMs = 20000) {
  const res = await fetch(`https://api.telegram.org/bot${config.token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.description || method);
  return json.result;
}

async function send(target, text) {
  if (!target) return;
  const body = String(text).slice(0, 3500);
  await tg('sendMessage', { chat_id: target, text: body, disable_web_page_preview: true });
}

setResultHandler(async ({ n, json, retryMs }) => {
  if (!chatId) return;
  const parts = [formatResult(n, json)];
  if (!json.success && retryMs > 0) parts.push(line('retry', `in ${Math.round(retryMs / 1000)}s`));
  await send(chatId, parts.join('\n'));
});

async function onMessage(msg) {
  const from = msg.chat?.id;
  const text = String(msg.text || '').trim();
  if (!from || !text.startsWith('/')) return;
  const command = text.split(/\s+/)[0].split('@')[0].toLowerCase();

  if (!chatId) {
    chatId = from;
    saveChatId(chatId);
    await send(from, 'Bot online.\nSame flow chal raha hai: 10 sec pe 1 account, error pe 10-20 sec.\nAccounts is chat pe aayenge.');
    return;
  }
  if (String(from) !== String(chatId)) {
    await send(from, 'Ye bot private hai.');
    return;
  }
  if (command === '/start' || command === '/status') {
    await send(from, 'Bot online. Generator chal raha hai.\n10 sec pe 1 account. Error pe 10-20 sec ruk ke continue.');
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
      console.log(`poll error: ${e.message}`);
      await sleep(3000);
    }
  }
}

async function main() {
  await tg('deleteWebhook', { drop_pending_updates: false });
  await tg('setMyCommands', {
    commands: [
      { command: 'start', description: 'Get accounts in this chat' },
      { command: 'status', description: 'Bot is online' },
    ],
  });
  console.log(chatId ? `Telegram chat ${chatId}` : 'Telegram waiting for /start');
  start(config.region);
  await pollUpdates();
}

main().catch((e) => {
  console.log(`bot crashed: ${e.message}`);
  process.exit(1);
});
