// 🌐 Velvet Assistant WhatsApp Bot (Core + AI)
// 📌 By John Odhiambo

import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'
import P from 'pino'
import axios from 'axios'

// === AI Utility Functions ===
async function askAI(prompt) {
  try {
    const res = await axios.post('https://api.gpt4free.online/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    })
    return res.data.choices[0].message.content
  } catch (err) {
    console.log('❌ AI error:', err.message)
    return '⚠️ AI is currently unavailable.'
  }
}

async function summarizeText(text) {
  return await askAI(`Summarize this text in simple bullet points:\n\n${text}`)
}

async function translateText(text, lang) {
  return await askAI(`Translate this text into ${lang}:\n\n${text}`)
}

// === BOT CONNECTION ===
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    logger: P({ level: 'silent' })
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    const lower = text.toLowerCase().trim()

    // 🧠 AI Chat Command
    if (lower.startsWith('.ai')) {
      const prompt = text.replace('.ai', '').trim()
      if (!prompt) return sock.sendMessage(from, { text: '✍️ Please provide a prompt.' })
      const reply = await askAI(prompt)
      return sock.sendMessage(from, { text: reply })
    }

    // 📝 Summarize Command
    if (lower.startsWith('.summarize')) {
      const content = text.replace('.summarize', '').trim()
      if (!content) return sock.sendMessage(from, { text: '✍️ Please provide text to summarize.' })
      const summary = await summarizeText(content)
      return sock.sendMessage(from, { text: `📝 *Summary:*\n${summary}` })
    }

    // 🌍 Translate Command
    if (lower.startsWith('.translate')) {
      const parts = text.split(' ')
      if (parts.length < 3) {
        return sock.sendMessage(from, { text: 'Usage: `.translate <lang> <text>`' })
      }
      const lang = parts[1]
      const content = text.replace(`.translate ${lang}`, '').trim()
      const translated = await translateText(content, lang)
      return sock.sendMessage(from, { text: `🌍 *Translated (${lang}):*\n${translated}` })
    }

    // 🤖 Auto AI Reply for normal messages
    if (text && !text.startsWith('.')) {
      const reply = await askAI(text)
      await sock.sendMessage(from, { text: reply })
    }
  })
}

startBot()
