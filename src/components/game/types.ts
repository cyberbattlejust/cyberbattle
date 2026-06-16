export type GameView =
  | 'intro'
  | 'register'
  | 'login'
  | 'supervisor'
  | 'room'
  | 'team'
  | 'team-setup'
  | 'lobby'
  | 'role'
  | 'attack'
  | 'defense'
  | 'score'
  | 'logs'
  | 'missions';

export type TeamKey = 'A' | 'B';
export type TeamId = 'teamA' | 'teamB';

export type BattleRole = 'attack' | 'defense';
export type AccountRole = 'player' | 'admin' | 'moderator' | string;

export type ToolView =
  | 'none'
  | 'wireshark'
  | 'nmap'
  | 'metasploit'
  | 'burpsuite'
  | 'cmd'
  | 'malwarebytes'
  | 'nessus';

export interface RoomInfo {
  code: string;
  name: string;
  status?: string;
  maxPlayersPerTeam?: number;
  winScore?: number;
}

export interface ScoreTeamData {
  name?: TeamId;
  displayName?: string;
  configured?: boolean;
  configuredBy?: string;
  leaderUsername?: string;
  network: {
    ssid: string;
    password: string;
    passwordProtected?: boolean;
  };
  score: {
    attack: number;
    defense: number;
    total?: number;
  };
}

export interface ScoreData {
  success?: boolean;
  phase: string;
  status?: string;
  vulnerabilities: number;
  winScore?: number;
  maxPlayersPerTeam?: number;
  teamA: ScoreTeamData;
  teamB: ScoreTeamData;
}

export interface GameLogEntry {
  id: string;
  type: string;
  team: string;
  username: string;
  action: string;
  detail: string;
  success: boolean;
  points: number;
  createdAt: string;
}

export interface MissionEntry {
  id: string;
  title: string;
  description: string;
  type: 'attack' | 'defense' | string;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  points: number;
  durationSec: number;
  active: boolean;
  completedBy: string;
  activatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  answerProtected?: boolean;
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  team?: string;
  role?: string;
  roomCode?: string;
  playerId?: string;
}

export interface SystemMessage {
  message: string;
  timestamp: number;
}

export interface TypingUser {
  username: string;
  isTyping: boolean;
}

export interface LiveGameEvent {
  id?: string;
  type: string;
  player: {
    username: string;
    team: string;
    role?: string;
  };
  targetTeam?: string;
  success?: boolean;
  timestamp: number;
}

export interface PlayerInfo {
  id?: string;
  username?: string;
  team: string;
  role?: string;
  roomCode?: string;
}

export interface SessionUser {
  username: string;
  email: string;
  accountRole: AccountRole;
}

export interface RoomAccessForm {
  roomCode: string;
  password: string;
  roomName?: string;
  maxPlayersPerTeam?: number;
  winScore?: number;
}
