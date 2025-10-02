
// === GROUP 1: Core WhatsApp Features ===

// ✅ 1. Auto View Status
sock.ev.on('messages.upsert', async ({ messages }) => {
  const msg = messages[0]
  if (msg.key.remoteJid.endsWith('status@broadcast')) {
    try {
      await sock.readMessages([msg.key])
      console.log('👁️ Viewed a status automatically.')
    } catch (e) {
      console.log('⚠️ Auto-view error:', e.message)
    }
  }
})

// 🗑️ 2. Anti-Delete Messages
sock.ev.on('messages.update', async (updates) => {
  for (const update of updates) {
    if (update.message === null && update.key.fromMe === false) {
      const jid = update.key.remoteJid
      const deletedKey = update.key.id
      await sock.sendMessage(jid, { text: `🛑 *Anti-Delete*\nSomeone deleted a message (ID: ${deletedKey})` })
      console.log(`🗑️ Deleted message detected from ${jid}`)
    }
  }
})

// 🖼 3. Save “View Once” Media
sock.ev.on('messages.upsert', async ({ messages }) => {
  const m = messages[0]
  const msgContent = m.message?.viewOnceMessage?.message
  if (msgContent) {
    const type = Object.keys(msgContent)[0]
    await sock.sendMessage(m.key.remoteJid, {
      [type]: msgContent[type],
      caption: '🔁 Saved View Once Media'
    })
    console.log('🖼 Saved a View Once image/video.')
  }
})

// 🌐 4. Always Online
setInterval(() => {
  if (sock?.user) {
    sock.sendPresenceUpdate('available')
  }
}, 30000)

// ✍ 5. Fake Typing
async function fakeTyping(jid) {
  await sock.sendPresenceUpdate('composing', jid)
  setTimeout(() => sock.sendPresenceUpdate('paused', jid), 5000)
}

// 🎙 6. Fake Recording
async function fakeRecording(jid) {
  await sock.sendPresenceUpdate('recording', jid)
  setTimeout(() => sock.sendPresenceUpdate('paused', jid), 5000)
}

// ❤️ 7. Auto Like Status (Just reacts with ❤️ when viewing)
sock.ev.on('messages.upsert', async ({ messages }) => {
  const msg = messages[0]
  if (msg.key.remoteJid.endsWith('status@broadcast')) {
    try {
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: '❤️', key: msg.key }
      })
      console.log('❤️ Auto-liked a status')
    } catch (e) {
      console.log('Auto-like error:', e.message)
    }
  }
})

// ✅ 8. Auto Blue Ticks (marks all chats as read)
setInterval(async () => {
  try {
    const chats = await sock.chatModify({ markRead: true })
    console.log('✅ Marked chats as read')
  } catch (e) {
    // ignore errors silently
  }
}, 60000)

// 💬 9. Auto React to Texts
sock.ev.on('messages.upsert', async ({ messages }) => {
  const msg = messages[0]
  if (msg.message?.conversation && !msg.key.fromMe) {
    const reaction = ['😂','🔥','❤️','👍','😎','🤖'][Math.floor(Math.random()*6)]
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: reaction, key: msg.key }
    })
    console.log(`💬 Auto-reacted with ${reaction}`)
  }
})
