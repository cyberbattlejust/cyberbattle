# Cyber Battle

## RB Teams Multiplayer Cybersecurity Training Game

Cyber Battle is a supervisor-controlled, room-based multiplayer cybersecurity training web application. The system allows users to register, log in, create or join protected game rooms, select Team A or Team B, complete team setup, wait in a lobby, and participate in simulated attack, defense, and mission-based activities.

The implemented system uses:

* Next.js
* React
* TypeScript
* Prisma ORM
* SQLite
* Socket.IO
* Tailwind CSS
* Bun / npm

The current version uses simulated cybersecurity tools. It does not run real Nmap, Wireshark, Metasploit, Burp Suite, Nessus, Malwarebytes, VM targets, Docker targets, or a real cyber range. Real VM/container-based cyber range integration is future work.

---

## 1. Project Structure

```text
cyber-battle/
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  └─ page.tsx
│  ├─ components/
│  │  └─ game/
│  │     ├─ screens/
│  │     └─ tools/
│  ├─ hooks/
│  └─ lib/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ mini-services/
│  └─ chat-service/
│     └─ index.ts
├─ public/
│  ├─ audio/
│  ├─ images/
│  └─ videos/
├─ db/
├─ package.json
├─ bun.lock
├─ package-lock.json
├─ .env.example
└─ README.md
```

---

## 2. Requirements

The project requires:

* Bun, recommended for running the full project
* Node.js and npm, usable for the main Next.js application
* A modern browser with JavaScript and WebSocket support
* Free local port `3000` for the Next.js application
* Free local port `3003` for the Socket.IO service
* SQLite through Prisma

Prisma Studio is optional and opens on port `5555`.

---

## 3. Environment Variables

Create a `.env` file based on `.env.example`.

Required and optional variable names:

```env
DATABASE_URL=
NEXT_PUBLIC_SOCKET_URL=
CHAT_SERVICE_PORT=
CHAT_SERVICE_CORS_ORIGIN=
MISSION_SEED_SECRET=
```

Example local values:

```env
DATABASE_URL="file:../db/custom.db"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3003"
CHAT_SERVICE_PORT="3003"
CHAT_SERVICE_CORS_ORIGIN="http://localhost:3000"
MISSION_SEED_SECRET="replace-with-demo-secret"
```

Do not commit the real `.env` file to GitHub.

---

## 4. Install Dependencies

From the project root:

```bash
bun install
```

Alternative for the main Next.js application:

```bash
npm install
```

Install Socket.IO service dependencies:

```bash
cd mini-services/chat-service
bun install
```

Return to the project root when needed:

```bash
cd ../..
```

---

## 5. Prisma and Database Setup

Generate Prisma Client:

```bash
npm run db:generate
```

Synchronize the SQLite database with the Prisma schema:

```bash
npm run db:push
```

Alternative Bun commands:

```bash
bun run db:generate
bun run db:push
```

Optional Prisma Studio:

```bash
npx prisma studio
```

Prisma Studio opens at:

```text
http://localhost:5555
```

SQLite is file-based. It does not run as a separate database server.

---

## 6. Run the Socket.IO Service

Open a terminal in:

```text
mini-services/chat-service
```

Run:

```bash
bun run dev
```

Expected output:

```text
Cyber Chat Service running on port 3003
Default room: MAIN
Real-time events active
```

The Socket.IO service must remain running while using the game.

---

## 7. Run the Next.js Application

Open a second terminal in the project root:

```bash
npm run dev
```

or:

```bash
bun run dev
```

Open the application in the browser:

```text
http://localhost:3000
```

---

## 8. Production Build

To build the Next.js application:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

The application runs at:

```text
http://localhost:3000
```

The Socket.IO service must still be started separately.

---

## 9. Main User Flow

1. Open the application at `http://localhost:3000`.
2. Register a new user account.
3. Log in using the registered email and password.
4. Choose one of the room options:

   * Join as Player
   * Create as Supervisor
5. If creating a room, enter:

   * Display name
   * Room code
   * Room name
   * Room password
   * Players per team
   * Win target
6. If joining a room, enter:

   * Display name
   * Room code
   * Room password
7. Select Team A or Team B.
8. The first player in a team becomes the Team Leader.
9. The Team Leader configures:

   * Display name
   * Team name
   * SSID
   * Network password
10. Players wait in the lobby.
11. The Supervisor starts the game after both teams are ready.
12. Players choose Attack or Defense mode.
13. Players use simulated tools, complete missions, view scores, inspect logs, and use team chat.

---

## 10. Roles

### Player

A Player can:

* Register and log in
* Join a room
* Select a team
* Wait in the lobby
* Choose Attack or Defense mode
* Use simulated tools
* Submit mission answers
* View scoreboard and logs
* Use team chat

### Team Leader

The first player who joins a team becomes the Team Leader.

A Team Leader can configure:

* Team display name
* SSID
* Network password

### Supervisor

A Supervisor can:

* Create a room
* Set room code, password, team limit, and win target
* Start, pause, resume, finish, or reset the game
* Activate missions
* Monitor teams
* View scoreboard and logs
* Chat separately with Team A and Team B
* Update room settings

### Admin

The database supports an admin role. Admin and Supervisor roles are accepted by several protected APIs such as room control, room settings, mission activation, and reset.

---

## 11. Simulated Tools

The following tools are implemented as simulated training interfaces:

| Tool         | Mode             | Status    |
| ------------ | ---------------- | --------- |
| Nmap         | Attack / Defense | Simulated |
| Wireshark    | Attack / Defense | Simulated |
| Metasploit   | Attack           | Simulated |
| Burp Suite   | Attack           | Simulated |
| CMD          | Attack / Defense | Simulated |
| Nessus       | Defense          | Simulated |
| Malwarebytes | Defense          | Simulated |

These tools do not execute real binaries and are not connected to real VM/container targets.

---

## 12. Important API Routes

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/supervisor
```

### Rooms and Teams

```text
GET  /api/rooms
GET  /api/rooms/status
POST /api/rooms/control
POST /api/rooms/start
POST /api/rooms/settings
POST /api/rooms/team-leader
GET  /api/sessions
POST /api/sessions
POST /api/game/teams/config
```

### Gameplay

```text
POST /api/game/attack
POST /api/game/defense
POST /api/game/scan
POST /api/game/packets
POST /api/game/reset
GET  /api/score
```

### Missions and Logs

```text
GET  /api/missions
POST /api/missions/activate
POST /api/missions/complete
POST /api/missions/seed
GET  /api/logs
```

---

## 13. Socket.IO Events

### Client to Server

```text
create-room
join-room
restore-room-access
join-team
join-supervisor
chat-message
typing
tool-launched
attack-event
defense-event
room-settings-updated
global-message
phase-change
```

### Server to Client

```text
room-created
room-joined
room-error
joined
supervisor-joined
players-update
player-joined
player-left
chat-message
system-message
global-system-message
global-message
user-typing
game-event
score-changed
phase-updated
```

---

## 14. Security Notes

The implementation includes:

* Password hashing using `scrypt`
* Timing-safe password comparison
* Supervisor/Admin role checks for protected actions
* Team Leader permission checks
* Room password validation
* Room access token usage
* Log sanitization
* Masking of sensitive values in displayed logs

The original room password is not stored in browser `sessionStorage`. After successful access, the system stores a room access token instead.

---

## 15. Troubleshooting

### Dependencies not installed

Run:

```bash
bun install
```

or:

```bash
npm install
```

Also install dependencies inside:

```text
mini-services/chat-service
```

### Prisma error

Run:

```bash
npm run db:generate
npm run db:push
```

or:

```bash
bun run db:generate
bun run db:push
```

### Socket.IO service not running

Start it from:

```text
mini-services/chat-service
```

using:

```bash
bun run dev
```

### Port conflict

Check port 3000:

```powershell
Get-NetTCPConnection -LocalPort 3000
```

Check port 3003:

```powershell
Get-NetTCPConnection -LocalPort 3003
```

Stop a process by ID:

```powershell
Stop-Process -Id 12345 -Force
```

Replace `12345` with the real process ID.

### Room join failure

Possible causes:

* Wrong room code
* Wrong room password
* Socket.IO service restarted
* Room exists in database but not in Socket.IO memory

Fix:

* Restart both services
* Recreate the room
* Join again with the correct room code and password

### Mission activation not working

Check that:

* The room is in playing state
* The user has Supervisor or Admin role
* The mission is available for activation

### Chat or scoreboard not updating

Check that:

* Socket.IO service is running on port 3003
* The browser is connected
* The user is in the correct room and team
* The page has been refreshed after service restart

---

## 16. Features Not Implemented in the Current Version

Do not describe the following as implemented features:

* Real VM cyber range
* Real Docker/container targets
* Real Nmap, Wireshark, Metasploit, Burp Suite, Nessus, or Malwarebytes execution
* Real attacks against real networks
* Supervisor mission creation from the interface
* Supervisor tool editing from the interface
* Automated test suite
* Production-grade distributed Socket.IO storage
* Confirmed JWT, NextAuth, or secure cookie authentication

These are future enhancements or not confirmed from the repository.

---

## 17. Future Work

Possible future improvements include:

* Real VM/container-based cyber range integration
* Supervisor mission creation
* Supervisor tool customization
* Stronger server-side authentication
* Persistent Socket.IO room metadata storage
* Automated unit and integration testing
* Deployment hardening
* Desktop or mobile application packaging

```
```
