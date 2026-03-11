# Unsere Kitty Welt (Python + aiosqlite)

Diese Version braucht **kein npm** und kein Vite. Sie laeuft direkt in VS Code mit Python.

## Was drin ist
- Passwort-Screen
- Dropdown Login als **Caedes** oder **M**
- fester Room-Code
- Live Tic-Tac-Toe fuer 2 Spieler
- Win-Animation
- Rematch-System: beide klicken **Nochmal spielen**
- Live-Chat
- Call-Status: anrufen, annehmen, auflegen
- Join-Status: beide online / offline
- Distanz auf **430 km**
- wirklich runde Profilbilder
- Hello-Kitty-Icon
- Datenbank mit **aiosqlite**

## Start in VS Code

1. ZIP entpacken
2. Ordner in VS Code oeffnen
3. Terminal oeffnen
4. Optional eine virtuelle Umgebung erstellen:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

5. Pakete installieren:

```powershell
pip install -r requirements.txt
```

6. Server starten:

```powershell
python -m uvicorn app:app --reload
```

7. Im Browser oeffnen:

```text
http://127.0.0.1:8000
```

## Zu zweit spielen
- Starte den Server auf einem Rechner.
- Oeffne die Seite in 2 Browsern oder 2 Geraeten.
- Beide loggen sich mit dem gleichen Passwort ein.
- Einer waehlt **Caedes**, der andere **M**.
- Beide benutzen den gleichen Room-Code, z. B. `KITTY430`.

## Hinweise
- Diese Version ist fuer **lokal / eigenen Server** gedacht.
- Fuer Vercel Free waere **Supabase** besser.
- Mit aiosqlite ist das super fuer VS Code und lokal, aber nicht ideal fuer serverlose Hosts.
