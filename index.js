// 🌐 Velvet Assistant WhatsApp Bot — Full Version
// 📌 All commands included (AI + Utilities + Downloaders + Image)
// 👑 By John Odhiambo

import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'
import P from 'pino'
import axios from 'axios'
import ytdl from 'ytdl-core'
import fs from 'fs'
import { exec } from 'child_process'

// === AI FUNCTIONS ===
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
  return await askAI(`Summarize this text in bullet points:\n\n${text}`)
}

async function translateText(text, lang) {
  return await askAI(`Translate this text into ${lang}:\n\n${text}`)
}

// === SONG DOWNLOADER ===
async function downloadSong(url, file) {
  return new Promise((resolve, reject) => {
    ytdl(url, { filter: 'audioonly' })
      .pipe(fs.createWriteStream(file))
      .on('finish', () => resolve(file))
      .on('error', reject)
  })
}

// === IMAGE GENERATION ===
async function generateImage(prompt) {
  const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
  return imgUrl
}

// === BOT START ===
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    logger: P({ level: 'silent' })
  })

  sock.ev.on('creds.update', saveCreds)

  // 👁️ Auto View Status
  sock.ev.on('messages.upsert', async (status) => {
    if (status.type === 'notify') {
      for (const s of status.messages) {
        if (s.key && s.key.remoteJid.endsWith('status@broadcast')) {
          await sock.readMessages([s.key])
        }
      }
    }
  })

  // 🗑️ Detect Deleted Messages
  sock.ev.on('messages.update', (updates) => {
    for (const update of updates) {
      if (update.update.messageStubType === 1) {
        sock.sendMessage(update.key.remoteJid, { text: '🗑️ A message was deleted!' })
      }
    }
  })

  // 📩 Handle Commands
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    const lower = text.toLowerCase().trim()

    // === AI Commands ===
    if (lower.startsWith('.ai')) {
      const prompt = text.replace('.ai', '').trim()
      const reply = await askAI(prompt)
      return sock.sendMessage(from, { text: reply })
    }

    if (lower.startsWith('.summarize')) {
      const content = text.replace('.summarize', '').trim()
      const summary = await summarizeText(content)
      return sock.sendMessage(from, { text: `📝 *Summary:*\n${summary}` })
    }

    if (lower.startsWith('.translate')) {
      const parts = text.split(' ')
      const lang = parts[1]
      const content = text.replace(`.translate ${lang}`, '').trim()
      const translated = await translateText(content, lang)
      return sock.sendMessage(from, { text: `🌍 *Translated (${lang}):*\n${translated}` })
    }

    // ✍️ Fake Typing
    if (lower === '.faketyping') {
      await sock.sendPresenceUpdate('composing', from)
      return sock.sendMessage(from, { text: '✍️ Fake typing enabled.' })
    }

    // 🎙️ Fake Recording
    if (lower === '.fakerecording') {
      await sock.sendPresenceUpdate('recording', from)
      return sock.sendMessage(from, { text: '🎙️ Fake recording started.' })
    }

    // 🌐 Always Online
    if (lower === '.alwaysonline') {
      setInterval(() => sock.sendPresenceUpdate('available', from), 10000)
      return sock.sendMessage(from, { text: '🌐 Always online mode activated.' })
    }

    // ❤️‍🔥 Auto Like Status (Simulated)
    if (lower === '.autolike') {
      return sock.sendMessage(from, { text: '❤️‍🔥 Auto-like enabled (simulated).' })
    }

    // 🎧 Download Song from YouTube
    if (lower.startsWith('.song')) {
      const url = text.split(' ')[1]
      if (!url) return sock.sendMessage(from, { text: 'Usage: .song <YouTube_URL>' })
      const file = `./temp_${Date.now()}.mp3`
      await downloadSong(url, file)
      await sock.sendMessage(from, { audio: { url: file }, mimetype: 'audio/mp4' })
      fs.unlinkSync(file)
    }

    // 📽 Download Video (IG/YT/FB using yt-dlp)
    if (lower.startsWith('.video')) {
      const url = text.split(' ')[1]
      if (!url) return sock.sendMessage(from, { text: 'Usage: .video <URL>' })
      const file = `./temp_${Date.now()}.mp4`
      exec(`yt-dlp -o "${file}" ${url}`, async (err) => {
        if (err) return sock.sendMessage(from, { text: '❌ Download failed.' })
        await sock.sendMessage(from, { video: { url: file }, caption: '📽 Downloaded Video' })
        fs.unlinkSync(file)
      })
    }

    // 🖼️ Generate Image from Text
    if (lower.startsWith('.image')) {
      const prompt = text.replace('.image', '').trim()
      if (!prompt) return sock.sendMessage(from, { text: 'Usage: .image <prompt>' })
      const imgUrl = await generateImage(prompt)
      await sock.sendMessage(from, { image: { url: imgUrl }, caption: `🖼️ ${prompt}` })
    }

    // 🤖 Auto AI Smart Replies
    if (text && !text.startsWith('.')) {
      const reply = await askAI(text)
      await sock.sendMessage(from, { text: reply })
    }
  })
}

startBot()
