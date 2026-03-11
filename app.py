import asyncio
import base64
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import aiosqlite
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / 'love.db'
STATIC_DIR = BASE_DIR / 'static'

app = FastAPI(title='Only Us')
app.mount('/static', StaticFiles(directory=STATIC_DIR), name='static')

ROOMS: dict[str, set[WebSocket]] = {}
ROOM_LOCKS: dict[str, asyncio.Lock] = {}
ROOM_CACHE: dict[str, dict[str, Any]] = {}

PLAYER_NAMES = {'caedes': 'Caedes', 'm': 'M'}
PLAYER_MARKS = {'caedes': 'X', 'm': 'O'}
PLAYER_AVATARS = {
    'caedes': 'https://cdn.discordapp.com/avatars/285824493748748299/a731b87abece349eabab49456772f4be.webp?size=1024',
    'm': 'https://cdn.discordapp.com/avatars/1400955242949906514/b5f4d8737885cda35fc089724ec48890.webp?size=1024',
}
DISTANCE_KM = 430
PASSWORD = 'kittylove'
MAX_MEDIA_CHARS = 2_500_000


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def initial_board() -> list[Any]:
    return [None] * 9


def calculate_winner(board: list[Any]):
    lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ]
    for line in lines:
        a, b, c = line
        if board[a] and board[a] == board[b] == board[c]:
            return {'winner': board[a], 'line': line}
    return None


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            '''
            CREATE TABLE IF NOT EXISTS rooms (
                room_code TEXT PRIMARY KEY,
                board TEXT NOT NULL,
                turn TEXT NOT NULL,
                winner TEXT,
                winning_line TEXT,
                player_caedes_ready INTEGER NOT NULL DEFAULT 0,
                player_m_ready INTEGER NOT NULL DEFAULT 0,
                player_caedes_online INTEGER NOT NULL DEFAULT 0,
                player_m_online INTEGER NOT NULL DEFAULT 0,
                caller TEXT,
                incoming_for TEXT,
                in_call INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            '''
        )
        await db.execute(
            '''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_code TEXT NOT NULL,
                sender TEXT NOT NULL,
                sender_key TEXT NOT NULL,
                kind TEXT NOT NULL DEFAULT 'text',
                content TEXT NOT NULL,
                file_name TEXT,
                created_at TEXT NOT NULL
            )
            '''
        )
        # lightweight migrations for existing DBs
        try:
            await db.execute("ALTER TABLE rooms ADD COLUMN incoming_for TEXT")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE messages ADD COLUMN sender_key TEXT")
            await db.execute("UPDATE messages SET sender_key = CASE WHEN sender='Caedes' THEN 'caedes' ELSE 'm' END WHERE sender_key IS NULL")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE messages ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE messages ADD COLUMN file_name TEXT")
        except Exception:
            pass
        await db.commit()


@app.on_event('startup')
async def startup_event():
    await init_db()


@app.get('/')
async def index():
    return FileResponse(STATIC_DIR / 'index.html')


async def ensure_room(room_code: str):
    room_code = room_code.upper().strip() or 'KITTY430'
    now = utc_now()
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute('SELECT room_code FROM rooms WHERE room_code = ?', (room_code,))
        row = await cur.fetchone()
        if not row:
            await db.execute(
                '''
                INSERT INTO rooms (
                    room_code, board, turn, winner, winning_line,
                    player_caedes_ready, player_m_ready,
                    player_caedes_online, player_m_online,
                    caller, incoming_for, in_call, created_at, updated_at
                ) VALUES (?, ?, 'X', NULL, NULL, 0, 0, 0, 0, NULL, NULL, 0, ?, ?)
                ''',
                (room_code, json.dumps(initial_board()), now, now),
            )
            await db.commit()
    return room_code


async def get_room_state(room_code: str):
    room_code = await ensure_room(room_code)
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            '''
            SELECT board, turn, winner, winning_line,
                   player_caedes_ready, player_m_ready,
                   player_caedes_online, player_m_online,
                   caller, incoming_for, in_call
            FROM rooms WHERE room_code = ?
            ''',
            (room_code,),
        )
        row = await cur.fetchone()
        msg_cur = await db.execute(
            'SELECT sender, sender_key, kind, content, file_name, created_at FROM messages WHERE room_code = ? ORDER BY id ASC LIMIT 200',
            (room_code,),
        )
        messages = [
            {
                'sender': sender,
                'senderKey': sender_key,
                'kind': kind,
                'content': content,
                'fileName': file_name,
                'createdAt': created_at,
            }
            for sender, sender_key, kind, content, file_name, created_at in await msg_cur.fetchall()
        ]
    state = {
        'roomCode': room_code,
        'board': json.loads(row[0]),
        'turn': row[1],
        'winner': row[2],
        'winningLine': json.loads(row[3]) if row[3] else [],
        'ready': {'caedes': bool(row[4]), 'm': bool(row[5])},
        'online': {'caedes': bool(row[6]), 'm': bool(row[7])},
        'caller': row[8],
        'incomingFor': row[9],
        'inCall': bool(row[10]),
        'messages': messages,
        'distanceKm': DISTANCE_KM,
        'playerNames': PLAYER_NAMES,
        'avatars': PLAYER_AVATARS,
    }
    ROOM_CACHE[room_code] = state
    return state


async def update_room(room_code: str, **updates):
    room_code = await ensure_room(room_code)
    fields = []
    values = []
    for key, value in updates.items():
        if isinstance(value, (list, dict)):
            value = json.dumps(value)
        if isinstance(value, bool):
            value = 1 if value else 0
        fields.append(f'{key} = ?')
        values.append(value)
    fields.append('updated_at = ?')
    values.append(utc_now())
    values.append(room_code)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE rooms SET {', '.join(fields)} WHERE room_code = ?", values)
        await db.commit()


async def add_message(room_code: str, sender_key: str, kind: str, content: str, file_name: str | None = None):
    room_code = await ensure_room(room_code)
    content = content[:MAX_MEDIA_CHARS]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            'INSERT INTO messages (room_code, sender, sender_key, kind, content, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (room_code, PLAYER_NAMES[sender_key], sender_key, kind, content, file_name, utc_now()),
        )
        await db.commit()


async def broadcast_state(room_code: str):
    state = await get_room_state(room_code)
    dead = []
    for ws in ROOMS.get(room_code, set()):
        try:
            await ws.send_json({'type': 'state', 'payload': state})
        except Exception:
            dead.append(ws)
    for ws in dead:
        ROOMS.get(room_code, set()).discard(ws)


async def set_online(room_code: str, player: str, online: bool):
    field = 'player_caedes_online' if player == 'caedes' else 'player_m_online'
    await update_room(room_code, **{field: online})


async def room_lock(room_code: str):
    if room_code not in ROOM_LOCKS:
        ROOM_LOCKS[room_code] = asyncio.Lock()
    return ROOM_LOCKS[room_code]


@app.websocket('/ws/{room_code}/{player}')
async def websocket_room(websocket: WebSocket, room_code: str, player: str):
    room_code = (room_code or 'KITTY430').upper().strip()
    player = player.lower().strip()
    if player not in PLAYER_NAMES:
        await websocket.close(code=1008)
        return

    await ensure_room(room_code)
    await websocket.accept()
    ROOMS.setdefault(room_code, set()).add(websocket)
    await set_online(room_code, player, True)
    await broadcast_state(room_code)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get('action')
            lock = await room_lock(room_code)
            async with lock:
                state = await get_room_state(room_code)
                if action == 'move':
                    index = int(data.get('index', -1))
                    if 0 <= index < 9 and not state['winner'] and state['board'][index] is None:
                        expected = PLAYER_MARKS[player]
                        if state['turn'] == expected:
                            board = state['board'][:]
                            board[index] = expected
                            result = calculate_winner(board)
                            next_turn = 'O' if expected == 'X' else 'X'
                            await update_room(
                                room_code,
                                board=board,
                                turn=next_turn if not result else state['turn'],
                                winner=result['winner'] if result else None,
                                winning_line=result['line'] if result else None,
                            )
                elif action == 'chat':
                    kind = (data.get('kind') or 'text').strip()
                    content = (data.get('content') or '').strip()
                    file_name = (data.get('fileName') or '').strip() or None
                    if kind == 'text' and content:
                        await add_message(room_code, player, kind, content[:2000])
                    elif kind in {'image', 'audio'} and content.startswith('data:'):
                        if len(content) <= MAX_MEDIA_CHARS:
                            await add_message(room_code, player, kind, content, file_name)
                elif action == 'rematch':
                    ready_field = 'player_caedes_ready' if player == 'caedes' else 'player_m_ready'
                    await update_room(room_code, **{ready_field: bool(data.get('ready', True))})
                    fresh = await get_room_state(room_code)
                    if fresh['ready']['caedes'] and fresh['ready']['m']:
                        await update_room(
                            room_code,
                            board=initial_board(),
                            turn='X',
                            winner=None,
                            winning_line=None,
                            player_caedes_ready=False,
                            player_m_ready=False,
                        )
                elif action == 'call':
                    mode = data.get('mode')
                    other = 'm' if player == 'caedes' else 'caedes'
                    if mode == 'start':
                        await update_room(room_code, caller=player, incoming_for=other, in_call=False)
                    elif mode == 'accept':
                        await update_room(room_code, caller=None, incoming_for=None, in_call=True)
                    elif mode == 'end':
                        await update_room(room_code, caller=None, incoming_for=None, in_call=False)
                elif action == 'heartbeat':
                    pass
            await broadcast_state(room_code)
    except WebSocketDisconnect:
        pass
    finally:
        ROOMS.get(room_code, set()).discard(websocket)
        await set_online(room_code, player, False)
        state = await get_room_state(room_code)
        if not state['online']['caedes'] and not state['online']['m']:
            await update_room(room_code, caller=None, incoming_for=None, in_call=False)
        await broadcast_state(room_code)
