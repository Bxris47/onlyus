const app = document.getElementById('app')

const state = {
  unlocked: false,
  player: localStorage.getItem('kitty_player') || 'caedes',
  password: '',
  activePage: 'home',
  roomCode: localStorage.getItem('kitty_room') || 'KITTY430',
  socket: null,
  recorder: null,
  recordingChunks: [],
  flash: false,
  room: {
    roomCode: 'KITTY430',
    board: Array(9).fill(null),
    turn: 'X',
    winner: null,
    winningLine: [],
    ready: { caedes: false, m: false },
    online: { caedes: false, m: false },
    caller: null,
    incomingFor: null,
    inCall: false,
    messages: [],
    distanceKm: 430,
    playerNames: { caedes: 'Caedes', m: 'M' },
    avatars: {
      caedes: 'https://cdn.discordapp.com/avatars/285824493748748299/a731b87abece349eabab49456772f4be.webp?size=1024',
      m: 'https://cdn.discordapp.com/avatars/1400955242949906514/b5f4d8737885cda35fc089724ec48890.webp?size=1024',
    },
  },
}

let heartbeatTimer = null

function render() {
  app.innerHTML = `
    <div class="page ${state.flash ? 'flash' : ''}">
      <div class="floating">
        <img src="/static/kitty.png" class="f1" width="42" height="42" alt="" />
        <img src="/static/kitty.png" class="f2" width="48" height="48" alt="" />
        <img src="/static/kitty.png" class="f3" width="38" height="38" alt="" />
      </div>
      ${state.unlocked ? renderMain() : renderLock()}
    </div>
  `
  bind()
  bindVoicePlayers()
}

function renderLock() {
  return `
    <div class="lock card">
      <div style="display:flex;justify-content:center;margin-bottom:18px">
        <img src="/static/kitty.png" class="kit-big" alt="kitty" />
      </div>
      <h2 style="margin:0;text-align:center;color:#be185d">Only Us</h2>

      <div class="lock-row">
        <div class="picker">
          ${playerCard('caedes')}
          ${playerCard('m')}
        </div>

        <input
          class="input"
          id="pwInput"
          type="password"
          value="${escapeHtml(state.password)}"
          placeholder="Passwort"
        />
      </div>

      <div class="actions">
        <button class="btn" id="unlockBtn">Öffnen</button>
      </div>
    </div>
  `
}

function playerCard(key) {
  const selected = state.player === key ? 'selected' : ''
  const decorated = key === 'm'

  return `
    <button class="player-card ${selected}" type="button" data-player="${key}">
      <div class="player-avatar ${decorated ? 'player-avatar--decorated' : ''}">
        <img src="${state.room.avatars[key]}" alt="${state.room.playerNames[key]}" />
        ${decorated ? `<img src="/static/img/m-deco.png" alt="" class="player-avatar-deco" />` : ''}
      </div>
      <div>
        <div class="player-name">${state.room.playerNames[key]}</div>
        <div class="player-sub">einloggen als ${state.room.playerNames[key]}</div>
      </div>
    </button>
  `
}

function renderMain() {
  return `
    <div class="wrap">
      <header class="topbar card">
        <div class="brand">
          <img src="/static/kitty.png" alt="kitty" />
          <div>
            <h1>Only Us</h1>
          </div>
        </div>

        <div class="nav">
          ${navButton('home', 'Start')}
          ${navButton('story', 'Story')}
          ${navButton('future', 'Zukunft')}
          ${navButton('distance', 'Entfernung')}
          ${navButton('games', 'Spiele')}
          ${navButton('chat', 'Chat + Call')}
        </div>
      </header>

      ${renderPage()}
    </div>
  `
}

function navButton(page, label) {
  return `<button class="${state.activePage === page ? 'active' : ''}" data-page="${page}">${label}</button>`
}

function renderPage() {
  switch (state.activePage) {
    case 'story':
      return renderStory()
    case 'future':
      return renderFuture()
    case 'distance':
      return renderDistance()
    case 'games':
      return renderGames()
    case 'chat':
      return renderChat()
    default:
      return renderHome()
  }
}

function renderHome() {
  return `
    <div class="grid home-grid">
      <section class="panel card">
        <div class="badge"><img src="/static/kitty.png" class="kit-small" alt="" /> Für uns</div>
        <h2>Ein Ort nur für dich und mich</h2>
        <p>Ich wollte eine Seite machen, die süß aussieht, sich leicht anfühlt und trotzdem genug kann, damit wir auch zusammen schreiben, spielen und anrufen können.</p>

        <div class="cards">
          ${homeCard('story', 'Wie wir uns kennengelernt haben', 'Der Anfang von uns.')}
          ${homeCard('future', 'Unsere Zukunft', 'Alles, was ich mit dir noch erleben will.')}
          ${homeCard('distance', 'Wie weit wir weg sind', 'Und trotzdem bist du mir nah.')}
          ${homeCard('chat', 'Chat + Call', 'Schreiben, Bilder, Sprachnachrichten und anrufen.')}
        </div>
      </section>

      <section class="panel card">
        <div class="row space">
          <h3>Unser kleines Profil</h3>
          <img src="/static/kitty.png" class="kitty" alt="" />
        </div>

        <div class="profile-row">
          ${profileCard('caedes')}
          <div class="heart-mid">♡</div>
          ${profileCard('m')}
        </div>

        <div class="online">
          ${onlinePill('caedes')}
          ${onlinePill('m')}
        </div>
      </section>
    </div>
  `
}

function homeCard(page, title, text) {
  return `
    <button class="mini-card" data-page="${page}">
      <div class="row space">
        <strong>${title}</strong>
        <img src="/static/kitty.png" class="kitty" alt="" />
      </div>
      <p>${text}</p>
    </button>
  `
}

function profileCard(key) {
  const decorated = key === 'm'

  return `
    <div class="profile">
      <div class="avatar ${decorated ? 'avatar--decorated' : ''}">
        <img src="${state.room.avatars[key]}" alt="${state.room.playerNames[key]}" />
        ${decorated ? `<img src="/static/img/m-deco.png" alt="" class="avatar-deco" />` : ''}
      </div>
      <p>${state.room.playerNames[key]}</p>
    </div>
  `
}

function renderStory() {
  const items = [
    ['Erster Kontakt', 'Hier würde ich den Moment reinschreiben, an dem wir das erste Mal richtig geschrieben haben.'],
    ['Erstes Treffen', 'Hier würde ich erzählen, wie sich unser erstes Treffen für mich angefühlt hat.'],
    ['Besonderer Moment', 'Hier würde ich einen Moment reinschreiben, den ich mit dir niemals vergessen werde.'],
  ]

  return `
    <div class="grid">
      ${backBtn()}

      <section class="section card">
        <h2>Wie wir uns kennengelernt haben</h2>
        <p>Ich würde hier unsere echte Geschichte reinschreiben. Wie alles angefangen hat, was ich direkt an dir mochte und warum sich das mit uns von Anfang an besonders angefühlt hat.</p>
      </section>

      <section class="section card">
        <h3>Unsere Timeline</h3>
        <div class="story-list">
          ${items.map(([a, b]) => `
            <div class="story-item">
              <div class="dot"></div>
              <div>
                <strong>${a}</strong>
                <p>${b}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `
}

function renderFuture() {
  const dreams = ['Gemeinsame Reisen', 'Mehr Zeit zusammen', 'Schöne kleine Dates', 'Eigene Traditionen', 'Viele Erinnerungen', 'Noch mehr wir']

  return `
    <div class="grid">
      ${backBtn()}

      <section class="section card">
        <h2>Unsere Zukunft</h2>
        <p>Ich würde hier alles reinschreiben, was ich mit dir noch erleben will. Kleine Dates, Reisen, Erinnerungen, unsere eigenen Traditionen und einfach alles, worauf ich mich mit dir freue.</p>
      </section>

      <section class="cards">
        ${dreams.map(d => `
          <div class="mini-card">
            <div class="row space">
              <strong>${d}</strong>
              <img src="/static/kitty.png" class="kitty" alt="" />
            </div>
            <p>Ich würde dazu noch einen kleinen persönlichen Satz schreiben, damit jeder Punkt mehr nach uns klingt.</p>
          </div>
        `).join('')}
      </section>
    </div>
  `
}

function renderDistance() {
  return `
    <div class="grid">
      ${backBtn()}

      <section class="section card">
        <h2>Wie weit wir gerade voneinander entfernt sind</h2>
        <p style="max-width:720px;margin:10px auto 0;text-align:center;color:#b84f84;line-height:1.7;">
        </p>

        <div class="distance-layout">
          <div class="profile">
            <div class="distance-avatar">
              <img src="${state.room.avatars.caedes}" alt="Caedes" />
            </div>
            <p>Caedes</p>
          </div>

          <div style="text-align:center">
            <div class="distance-line">
            </div>
            <div class="km">${state.room.distanceKm} km entfernt</div>
          </div>

          <div class="profile">
            <div class="distance-avatar distance-avatar--m">
              <img src="${state.room.avatars.m}" alt="M" />
              <img src="/static/img/m-deco.png" alt="" class="m-profile-deco" />
            </div>
            <p>M</p>
          </div>
        </div>
      </section>
    </div>
  `
}

function renderGames() {
  return `
    <div class="grid">
      ${backBtn()}

      <section class="section card">
        <h2>Spiele</h2>

        <div class="games-grid">
          <div class="board-wrap">
            ${state.room.winner ? `
              <div class="confetti">
                ${Array.from({ length: 14 }, (_, i) => `
                  <div
                    class="piece"
                    style="left:${6 + i * 6}%;top:${(i % 3) * 8}%;animation-delay:${i * 0.05}s"
                  >
                    <img src="/static/kitty.png" alt="" />
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <div class="row space">
              <div>
                <h3 style="margin:0">Tic-Tac-Toe</h3>
                <p class="status">${gameStatus()}</p>
              </div>
              <button class="btn secondary" id="resetBoard">Neu starten</button>
            </div>

            <div class="board">
              ${state.room.board.map((cell, index) => gameTile(cell, index)).join('')}
            </div>

            <div class="rematch">
              <span class="ready ${state.room.ready.caedes ? 'ready-live' : ''}">
                Caedes ${state.room.ready.caedes ? 'bereit' : 'wartet'}
              </span>
              <span class="ready ${state.room.ready.m ? 'ready-live' : ''}">
                M ${state.room.ready.m ? 'bereit' : 'wartet'}
              </span>
              <button class="btn" id="rematchReady">Nochmal spielen</button>
              <button class="btn secondary" id="resetReady">Noch nicht</button>
            </div>
          </div>

          <section class="call-box game-side">
            <h3 style="margin-top:0">Spielstatus</h3>
            <p>${state.room.playerNames.caedes} spielt mit X und ${state.room.playerNames.m} spielt mit Kitty.</p>
            <div class="online">${onlinePill('caedes')}${onlinePill('m')}</div>
          </section>
        </div>
      </section>
    </div>
  `
}

function gameTile(cell, index) {
  const win = state.room.winningLine.includes(index) ? 'win' : ''
  return `
    <button class="tile ${win}" data-move="${index}">
      ${cell === 'X' ? 'X' : cell === 'O' ? '<img src="/static/kitty.png" class="kitty-play" alt="kitty" />' : ''}
    </button>
  `
}

function onlineStatusText(player) {
  if (state.room.online?.[player]) {
    return `${state.room.playerNames[player]} ist online`
  }
  return `Offline`
}

function renderChatHeroAvatar(player) {
  const safePlayer = player && state.room.playerNames[player] ? player : 'caedes'
  const avatar = state.room.avatars?.[safePlayer] || '/static/kitty.png'
  const name = state.room.playerNames?.[safePlayer] || 'User'
  const decorated = safePlayer === 'm'

  return `
    <div class="chat-hero-avatar ${decorated ? 'chat-hero-avatar--decorated' : ''}">
      <img
        src="${avatar}"
        alt="${escapeHtml(name)}"
        onerror="this.src='/static/kitty.png'"
      />
      ${decorated ? `<img src="/static/img/m-deco.png" alt="" class="chat-avatar-deco" onerror="this.style.display='none'" />` : ''}
    </div>
  `
}

function renderMiniProfile(player, large = false) {
  const safePlayer = player && state.room.playerNames[player] ? player : 'caedes'
  const avatar = state.room.avatars?.[safePlayer] || '/static/kitty.png'
  const name = state.room.playerNames?.[safePlayer] || 'User'
  const decorated = safePlayer === 'm'

  return `
    <div class="mini-profile ${large ? 'mini-profile--large' : ''} ${decorated ? 'mini-profile--decorated' : ''}">
      <img
        src="${avatar}"
        alt="${escapeHtml(name)}"
        onerror="this.src='/static/kitty.png'"
      />
      ${decorated ? `<img src="/static/img/m-deco.png" alt="" class="mini-profile-deco" onerror="this.style.display='none'" />` : ''}
    </div>
  `
}

function kittyImg(cls = 'kitty') {
  return `<img src="/static/kitty.png" alt="" class="${cls}" onerror="this.style.display='none'" />`
}

function renderChat() {
  const me = state.player === 'm' ? 'm' : 'caedes'
  const other = me === 'caedes' ? 'm' : 'caedes'

  return `
    <div class="grid">
      ${backBtn()}

      <section class="section card chat-page-card">
        <div class="chat-shell">
          <div class="chat-main">
            <div class="chat-header card-lite">
              <div class="chat-header__left">
                ${renderChatHeroAvatar(other)}
                <div>
                  <div class="chat-header__label">Unser Chat</div>
                  <h2>${escapeHtml(state.room.playerNames?.[other] || 'Chat')}</h2>
                  <p>${onlineStatusText(other)}</p>
                </div>
              </div>

              <div class="chat-header__right">
                <div class="chat-status-pill ${state.room.inCall ? 'live' : ''}">
                  ${state.room.inCall ? 'Im Call' : 'Gerade nicht im Call'}
                </div>
              </div>
            </div>

            <div class="chat-call-strip ${state.room.inCall ? 'in-call' : ''}">
              <div class="chat-call-strip__left">
                <div class="chat-call-icon">${kittyImg('kit-small ring')}</div>
                <div>
                  <strong>Call</strong>
                  <p>${callStatusText()}</p>
                </div>
              </div>

              <div class="chat-call-strip__actions">
                ${renderCallButtons()}
              </div>
            </div>

            <div class="chat-box" id="chatBox">
              ${renderMessages()}
            </div>

            <div class="chat-tools">
              <div class="chat-tools__left">
                <label class="tool-btn file-btn">
                  <span>Bild senden</span>
                  <input id="imageInput" type="file" accept="image/*" hidden />
                </label>

                <button class="tool-btn ${state.recorder ? 'recording' : ''}" id="recordBtn">
                  ${state.recorder ? 'Aufnahme läuft…' : 'Sprachnachricht'}
                </button>
              </div>

              <div class="chat-tools__hint">
                Bilder, Voice und Texte direkt hier im selben Chat.
              </div>
            </div>

            <div class="chat-compose">
              <textarea
                class="textarea chat-compose__input"
                id="chatInput"
                placeholder="Schreib mir etwas Süßes..."
              ></textarea>
              <button class="btn chat-compose__send" id="sendChat">Senden</button>
            </div>
          </div>

          <aside class="chat-side">
            <section class="chat-side-card">
              <div class="chat-side-card__top">
                <h3>Raum</h3>
                <div class="room-code">${escapeHtml(state.room.roomCode || 'KITTY430')}</div>
              </div>

              <div class="duo-stack">
                <div class="duo-person">
                  ${renderMiniProfile('caedes')}
                  <div>
                    <strong>${escapeHtml(state.room.playerNames?.caedes || 'Caedes')}</strong>
                    <p>${onlineStatusText('caedes')}</p>
                  </div>
                </div>

                <div class="duo-person">
                  ${renderMiniProfile('m')}
                  <div>
                    <strong>${escapeHtml(state.room.playerNames?.m || 'M')}</strong>
                    <p>${onlineStatusText('m')}</p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  `
}

function renderMessages() {
  const messages = Array.isArray(state.room.messages) ? state.room.messages : []

  if (!messages.length) {
    return `
      <div class="empty-chat">
        <div class="empty-chat__icon">${kittyImg('kit-big')}</div>
        <strong>Noch keine Nachrichten</strong>
        <p>Ich wollte hier einen Ort machen, an dem wir schreiben, Bilder schicken und uns kleine Sprachnachrichten dalassen können.</p>
      </div>
    `
  }

  return messages.map((msg, index) => {
    const sender = msg.sender || 'caedes'
    const me = sender === state.player
    const decorated = sender === 'm'
    const senderName = state.room.playerNames[sender] || sender
    const time = formatTime(msg.createdAt || msg.timestamp || Date.now())

    const text = msg.text || (msg.kind === 'text' ? msg.content : '')
    const image = msg.image || (msg.kind === 'image' ? msg.content : '')
    const audio = msg.audio || (msg.kind === 'audio' ? msg.content : '')
    const msgId = msg.id || `${sender}-${index}-${msg.createdAt || Date.now()}`

    return `
      <div class="msg-row ${me ? 'me' : ''}">
        <div class="bubble-avatar ${decorated ? 'bubble-avatar--decorated' : ''}">
          <img src="${state.room.avatars[sender]}" alt="${escapeHtml(senderName)}" />
          ${decorated ? `<img src="/static/img/m-deco.png" alt="" class="bubble-avatar-deco" />` : ''}
        </div>

        <div class="msg ${me ? 'me' : ''}">
          <div class="meta">
            <span>${escapeHtml(senderName)}</span>
            <span>•</span>
            <span>${escapeHtml(time)}</span>
          </div>

          ${text ? `<div class="msg-text">${escapeHtml(text)}</div>` : ''}

          ${image ? `
            <div class="msg-image-wrap">
              <img src="${image}" alt="Bild" class="msg-image" />
            </div>
          ` : ''}

          ${audio ? `
            <div class="voice-card" data-audio-id="${escapeHtml(msgId)}">
              <div class="voice-card__top">
                <div class="voice-card__left">
                  ${kittyImg('kit-small')}
                  <strong>Sprachnachricht</strong>
                </div>
                <span class="voice-badge">einmal anhören</span>
              </div>

              <audio
                class="audio-player once-audio"
                controls
                preload="metadata"
                data-once="true"
              >
                <source src="${audio}" type="audio/webm" />
              </audio>

              <p class="voice-hint">Nach dem Anhören wird sie als gehört markiert.</p>
            </div>
          ` : ''}
        </div>
      </div>
    `
  }).join('')
}

function bind() {
  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.onclick = () => {
      state.activePage = btn.dataset.page
      render()
    }
  })

  document.getElementById('unlockBtn')?.addEventListener('click', doUnlock)

  document.getElementById('pwInput')?.addEventListener('input', e => {
    state.password = e.target.value
  })

  document.getElementById('pwInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doUnlock()
  })

  document.querySelectorAll('[data-player]').forEach(btn => {
    btn.onclick = () => {
      state.player = btn.dataset.player
      render()
    }
  })

  document.querySelectorAll('[data-move]').forEach(btn => {
    btn.onclick = () => send({ action: 'move', index: Number(btn.dataset.move) })
  })

  document.getElementById('resetBoard')?.addEventListener('click', resetBoardLocal)
  document.getElementById('rematchReady')?.addEventListener('click', () => send({ action: 'rematch', ready: true }))
  document.getElementById('resetReady')?.addEventListener('click', () => send({ action: 'rematch', ready: false }))
  document.getElementById('sendChat')?.addEventListener('click', submitChat)

  document.getElementById('chatInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitChat()
    }
  })

  document.getElementById('callStart')?.addEventListener('click', () => send({ action: 'call', mode: 'start' }))
  document.getElementById('callAccept')?.addEventListener('click', () => send({ action: 'call', mode: 'accept' }))
  document.getElementById('callEnd')?.addEventListener('click', () => send({ action: 'call', mode: 'end' }))
  document.getElementById('imageInput')?.addEventListener('change', handleImageUpload)
  document.getElementById('recordBtn')?.addEventListener('click', toggleRecorder)

  const chatBox = document.getElementById('chatBox')
  if (chatBox) chatBox.scrollTop = chatBox.scrollHeight
}

function bindVoicePlayers() {
  document.querySelectorAll('.once-audio').forEach((audio) => {
    if (audio.dataset.bound === 'true') return
    audio.dataset.bound = 'true'

    let consumed = false

    audio.addEventListener('play', () => {
      if (consumed) {
        audio.pause()
        audio.currentTime = 0
      }
    })

    audio.addEventListener('ended', () => {
      consumed = true
      audio.controls = false

      const card = audio.closest('.voice-card')
      if (card) {
        const badge = card.querySelector('.voice-badge')
        const hint = card.querySelector('.voice-hint')

        if (badge) badge.textContent = 'angehört'
        if (hint) hint.textContent = 'Diese Sprachnachricht wurde bereits abgespielt.'
      }
    })
  })
}

function otherPlayer() {
  return state.player === 'caedes' ? 'm' : 'caedes'
}

function doUnlock() {
  if (state.password !== 'kittylove') {
    alert('Falsches Passwort, mein Herz.')
    return
  }

  state.roomCode = (state.roomCode || 'KITTY430').toUpperCase().trim()
  localStorage.setItem('kitty_player', state.player)
  localStorage.setItem('kitty_room', state.roomCode)

  state.unlocked = true
  connectSocket()
  render()
}

function connectSocket() {
  if (state.socket) state.socket.close()

  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  state.socket = new WebSocket(`${proto}://${location.host}/ws/${encodeURIComponent(state.roomCode)}/${encodeURIComponent(state.player)}`)

  state.socket.onmessage = event => {
    const msg = JSON.parse(event.data)

    if (msg.type === 'state') {
      const oldWinner = state.room.winner
      const oldReady = { ...state.room.ready }

      state.room = {
        ...state.room,
        ...msg.payload,
      }

      if (!Array.isArray(state.room.messages)) {
        state.room.messages = []
      }

      if (!oldWinner && state.room.winner) triggerFlash()
      if ((oldReady.caedes || oldReady.m) && !state.room.ready.caedes && !state.room.ready.m) triggerFlash()

      render()
    }
  }

  state.socket.onclose = () => {
    clearInterval(heartbeatTimer)
    heartbeatTimer = setTimeout(() => {
      if (state.unlocked) connectSocket()
    }, 1400)
  }

  clearInterval(heartbeatTimer)

  heartbeatTimer = setInterval(() => {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      send({ action: 'heartbeat' })
    }
  }, 8000)
}

function triggerFlash() {
  state.flash = true
  render()

  setTimeout(() => {
    state.flash = false
    render()
  }, 800)
}

function submitChat() {
  const input = document.getElementById('chatInput')
  if (!input) return

  const value = input.value.trim()
  if (!value) return

  send({
    action: 'chat',
    kind: 'text',
    content: value,
  })

  input.value = ''
}

function handleImageUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    send({
      action: 'chat',
      kind: 'image',
      content: reader.result,
      fileName: file.name,
    })
  }

  reader.readAsDataURL(file)
  event.target.value = ''
}

async function toggleRecorder() {
  if (state.recorder) {
    state.recorder.stop()
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)

    state.recordingChunks = []

    recorder.ondataavailable = e => {
      if (e.data.size) state.recordingChunks.push(e.data)
    }

    recorder.onstop = async () => {
      const blob = new Blob(state.recordingChunks, { type: recorder.mimeType || 'audio/webm' })
      const dataUrl = await blobToDataURL(blob)

      send({
        action: 'chat',
        kind: 'audio',
        content: dataUrl,
        fileName: 'sprachnachricht.webm',
      })

      stream.getTracks().forEach(track => track.stop())
      state.recorder = null
      render()
    }

    recorder.start()
    state.recorder = recorder
    render()
  } catch (err) {
    alert('Mikrofon konnte nicht gestartet werden.')
  }
}

function renderCallButtons() {
  if (state.room.inCall) {
    return `<button class="btn" id="callEnd">Auflegen</button>`
  }

  if (state.room.incomingFor === state.player) {
    return `
      <button class="btn ring" id="callAccept">Annehmen</button>
      <button class="btn secondary" id="callEnd">Ablehnen</button>
    `
  }

  if (state.room.caller === state.player) {
    return `<button class="btn secondary" id="callEnd">Auflegen</button>`
  }

  return `<button class="btn" id="callStart">Anrufen</button>`
}

function callStatusText() {
  if (state.room.inCall) return 'Ihr seid gerade im Call.'
  if (state.room.incomingFor === state.player) return `${state.room.playerNames[otherPlayer()]} ruft dich gerade an.`
  if (state.room.caller === state.player) return `Du rufst gerade ${state.room.playerNames[otherPlayer()]} an...`
  if (state.room.caller && state.room.caller !== state.player) return `${state.room.playerNames[state.room.caller]} ruft gerade an.`
  return 'Gerade ist kein Call aktiv.'
}

function onlinePill(key) {
  return `
    <div class="pill">
      <span class="on-dot ${state.room.online[key] ? 'live' : ''}"></span>
      ${state.room.playerNames[key]} ${state.room.online[key] ? 'online' : 'offline'}
    </div>
  `
}

function gameStatus() {
  if (state.room.winner === 'X') return 'Caedes hat gewonnen'
  if (state.room.winner === 'O') return 'M hat gewonnen'
  if (state.room.board.every(Boolean)) return 'Unentschieden'
  return state.room.turn === 'X' ? 'Caedes ist dran' : 'M ist dran'
}

function resetBoardLocal() {
  send({ action: 'rematch', ready: true })
}

function backBtn() {
  return `<div class="back"><button class="btn secondary" data-page="home">Zurück</button></div>`
}

function send(payload) {
  if (state.socket && state.socket.readyState === WebSocket.OPEN) {
    state.socket.send(JSON.stringify(payload))
  }
}

function blobToDataURL(blob) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

function formatTime(value) {
  try {
    return new Date(value).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

render()