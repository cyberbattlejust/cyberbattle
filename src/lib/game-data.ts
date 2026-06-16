// ============================================
// CyberArena - Game Data & Simulation Logic
// ============================================

import { CyberTool, Mission, Vulnerability, NetworkNode, ToolResult, PlayerRole } from './game-types';

// ==========================================
// TOOLS
// ==========================================

export const ATTACKER_TOOLS: CyberTool[] = [
  {
    id: 'nmap',
    name: 'NMAP Scanner',
    icon: '📡',
    category: 'reconnaissance',
    role: 'attacker',
    description: 'Network exploration and port scanning tool',
    cooldown: 3000,
    energyCost: 10,
    maxUses: 5,
  },
  {
    id: 'burp-suite',
    name: 'Burp Suite',
    icon: '🔍',
    category: 'analysis',
    role: 'attacker',
    description: 'Intercept and analyze HTTP requests',
    cooldown: 4000,
    energyCost: 15,
    maxUses: 4,
  },
  {
    id: 'sql-injection',
    name: 'SQL Injection',
    icon: '💉',
    category: 'exploitation',
    role: 'attacker',
    description: 'Exploit SQL database vulnerabilities',
    cooldown: 5000,
    energyCost: 25,
    maxUses: 3,
  },
  {
    id: 'metasploit',
    name: 'Metasploit',
    icon: '💣',
    category: 'exploitation',
    role: 'attacker',
    description: 'Advanced exploitation framework',
    cooldown: 6000,
    energyCost: 30,
    maxUses: 3,
  },
  {
    id: 'hydra',
    name: 'THC-Hydra',
    icon: '🔑',
    category: 'exploitation',
    role: 'attacker',
    description: 'Fast password brute-force tool',
    cooldown: 5000,
    energyCost: 20,
    maxUses: 3,
  },
  {
    id: 'nikto',
    name: 'Nikto',
    icon: '🕷️',
    category: 'reconnaissance',
    role: 'attacker',
    description: 'Web server vulnerability scanner',
    cooldown: 4000,
    energyCost: 12,
    maxUses: 4,
  },
];

export const DEFENDER_TOOLS: CyberTool[] = [
  {
    id: 'wireshark',
    name: 'Wireshark',
    icon: '🦈',
    category: 'monitoring',
    role: 'defender',
    description: 'Network protocol analyzer and packet sniffer',
    cooldown: 2000,
    energyCost: 8,
    maxUses: 6,
  },
  {
    id: 'firewall',
    name: 'Firewall Manager',
    icon: '🧱',
    category: 'defense',
    role: 'defender',
    description: 'Configure and manage firewall rules',
    cooldown: 3000,
    energyCost: 15,
    maxUses: 5,
  },
  {
    id: 'snort',
    name: 'Snort IDS',
    icon: '🚨',
    category: 'monitoring',
    role: 'defender',
    description: 'Intrusion detection and prevention system',
    cooldown: 3000,
    energyCost: 12,
    maxUses: 5,
  },
  {
    id: 'log-analyzer',
    name: 'Log Analyzer',
    icon: '📋',
    category: 'analysis',
    role: 'defender',
    description: 'Analyze system and security logs',
    cooldown: 2500,
    energyCost: 10,
    maxUses: 5,
  },
  {
    id: 'patch-manager',
    name: 'Patch Manager',
    icon: '🛡️',
    category: 'defense',
    role: 'defender',
    description: 'Apply security patches to vulnerable services',
    cooldown: 5000,
    energyCost: 25,
    maxUses: 4,
  },
  {
    id: 'fail2ban',
    name: 'Fail2Ban',
    icon: '🔒',
    category: 'defense',
    role: 'defender',
    description: 'Ban IPs that show malicious signs',
    cooldown: 3000,
    energyCost: 15,
    maxUses: 4,
  },
];

export const ALL_TOOLS = [...ATTACKER_TOOLS, ...DEFENDER_TOOLS];

// ==========================================
// MISSIONS
// ==========================================

const generateVulnerabilities = (missionId: string): Vulnerability[] => [
  {
    id: `${missionId}-vuln-1`,
    name: 'Open SSH Port (22)',
    severity: 'high',
    description: 'SSH service running with default credentials on port 22',
    points: 100,
    foundBy: null,
    exploitedBy: null,
    patchedBy: null,
    port: 22,
    service: 'OpenSSH 7.4',
  },
  {
    id: `${missionId}-vuln-2`,
    name: 'SQL Injection in Login Form',
    severity: 'critical',
    description: 'The login form is vulnerable to SQL injection attacks',
    points: 150,
    foundBy: null,
    exploitedBy: null,
    patchedBy: null,
  },
  {
    id: `${missionId}-vuln-3`,
    name: 'Outdated Apache Version',
    severity: 'high',
    description: 'Apache 2.4.49 has a known path traversal vulnerability (CVE-2021-41773)',
    points: 120,
    foundBy: null,
    exploitedBy: null,
    patchedBy: null,
    port: 80,
    service: 'Apache 2.4.49',
  },
  {
    id: `${missionId}-vuln-4`,
    name: 'Weak FTP Credentials',
    severity: 'medium',
    description: 'FTP server using weak/default password',
    points: 80,
    foundBy: null,
    exploitedBy: null,
    patchedBy: null,
    port: 21,
    service: 'vsftpd 2.3.4',
  },
  {
    id: `${missionId}-vuln-5`,
    name: 'Exposed phpMyAdmin',
    severity: 'critical',
    description: 'phpMyAdmin interface is publicly accessible without authentication',
    points: 200,
    foundBy: null,
    exploitedBy: null,
    patchedBy: null,
    port: 8080,
    service: 'phpMyAdmin 4.6.6',
  },
  {
    id: `${missionId}-vuln-6`,
    name: 'Unpatched OpenSSL',
    severity: 'critical',
    description: 'Heartbleed vulnerability in OpenSSL 1.0.1',
    points: 180,
    foundBy: null,
    exploitedBy: null,
    patchedBy: null,
    port: 443,
    service: 'OpenSSL 1.0.1e',
  },
];

const MISSION_1_NETWORK: NetworkNode[] = [
  {
    id: 'internet',
    name: 'Internet Gateway',
    type: 'router',
    ip: '0.0.0.0/0',
    os: 'N/A',
    services: [],
    status: 'secure',
  },
  {
    id: 'firewall-1',
    name: 'Edge Firewall',
    type: 'firewall',
    ip: '10.0.0.1',
    os: 'pfSense 2.6',
    services: [],
    status: 'secure',
  },
  {
    id: 'web-server',
    name: 'Web Server (Target)',
    type: 'server',
    ip: '10.0.0.10',
    os: 'Ubuntu 20.04 LTS',
    services: [
      { port: 80, name: 'HTTP', version: 'Apache 2.4.49', status: 'open', vulnerability: 'CVE-2021-41773' },
      { port: 443, name: 'HTTPS', version: 'OpenSSL 1.0.1e', status: 'open', vulnerability: 'Heartbleed' },
      { port: 22, name: 'SSH', version: 'OpenSSH 7.4', status: 'open', vulnerability: 'Default credentials' },
      { port: 8080, name: 'HTTP-Alt', version: 'phpMyAdmin 4.6.6', status: 'open', vulnerability: 'No auth' },
    ],
    status: 'secure',
  },
  {
    id: 'database',
    name: 'Database Server',
    type: 'database',
    ip: '10.0.0.20',
    os: 'CentOS 8',
    services: [
      { port: 3306, name: 'MySQL', version: 'MySQL 5.7.36', status: 'open' },
      { port: 21, name: 'FTP', version: 'vsftpd 2.3.4', status: 'open', vulnerability: 'Weak password' },
    ],
    status: 'secure',
  },
  {
    id: 'workstation',
    name: 'Admin Workstation',
    type: 'workstation',
    ip: '10.0.0.100',
    os: 'Windows 10',
    services: [
      { port: 3389, name: 'RDP', version: 'Microsoft RDP', status: 'filtered' },
      { port: 445, name: 'SMB', version: 'SMBv1', status: 'closed' },
    ],
    status: 'secure',
  },
];

const MISSION_2_NETWORK: NetworkNode[] = [
  {
    id: 'internet',
    name: 'Internet Gateway',
    type: 'router',
    ip: '0.0.0.0/0',
    os: 'N/A',
    services: [],
    status: 'secure',
  },
  {
    id: 'cloud-waf',
    name: 'Cloud WAF',
    type: 'firewall',
    ip: '172.16.0.1',
    os: 'AWS WAF',
    services: [],
    status: 'secure',
  },
  {
    id: 'app-server',
    name: 'Application Server',
    type: 'server',
    ip: '172.16.0.10',
    os: 'Debian 11',
    services: [
      { port: 443, name: 'HTTPS', version: 'Nginx 1.18.0', status: 'open' },
      { port: 8080, name: 'API', version: 'Node.js 14.x', status: 'open', vulnerability: 'SSRF' },
      { port: 9090, name: 'Admin Panel', version: 'React Admin', status: 'open', vulnerability: 'IDOR' },
      { port: 22, name: 'SSH', version: 'OpenSSH 8.2', status: 'filtered' },
    ],
    status: 'secure',
  },
  {
    id: 'redis-cache',
    name: 'Redis Cache',
    type: 'database',
    ip: '172.16.0.20',
    os: 'Ubuntu 20.04',
    services: [
      { port: 6379, name: 'Redis', version: 'Redis 6.0.9', status: 'open', vulnerability: 'No auth' },
    ],
    status: 'secure',
  },
  {
    id: 'postgres-db',
    name: 'PostgreSQL Database',
    type: 'database',
    ip: '172.16.0.30',
    os: 'Alpine Linux',
    services: [
      { port: 5432, name: 'PostgreSQL', version: 'PostgreSQL 13.2', status: 'open' },
    ],
    status: 'secure',
  },
];

export const MISSIONS: Mission[] = [
  {
    id: 'mission-1',
    title: 'Corporate Network Breach',
    description: 'A corporate network has been set up with known vulnerabilities. Your mission is to either breach the network and capture the flags, or defend it against all attacks.',
    backstory: 'CyberCorp Inc. has hired your team for a penetration test. The network contains sensitive data including customer records and financial information. As a Red Team (Attacker), you must find and exploit vulnerabilities to access the data. As a Blue Team (Defender), you must detect and neutralize all threats before the data is compromised.',
    difficulty: 'easy',
    timeLimit: 300, // 5 minutes
    targetSystem: '10.0.0.10 (Corporate Web Server)',
    pointsToWin: 500,
    objectives: [
      { id: 'obj-1', description: 'Scan the target network for open ports', role: 'attacker', points: 50, completed: false, completedBy: null },
      { id: 'obj-2', description: 'Identify at least 3 vulnerabilities', role: 'attacker', points: 100, completed: false, completedBy: null },
      { id: 'obj-3', description: 'Exploit a critical vulnerability', role: 'attacker', points: 150, completed: false, completedBy: null },
      { id: 'obj-4', description: 'Capture the flag from the database', role: 'attacker', points: 200, completed: false, completedBy: null },
      { id: 'obj-5', description: 'Monitor network traffic for suspicious activity', role: 'defender', points: 50, completed: false, completedBy: null },
      { id: 'obj-6', description: 'Configure firewall to block malicious IPs', role: 'defender', points: 100, completed: false, completedBy: null },
      { id: 'obj-7', description: 'Patch at least 2 critical vulnerabilities', role: 'defender', points: 150, completed: false, completedBy: null },
      { id: 'obj-8', description: 'Set up intrusion detection rules', role: 'defender', points: 100, completed: false, completedBy: null },
    ],
    vulnerabilities: generateVulnerabilities('mission-1'),
    networkMap: MISSION_1_NETWORK,
  },
  {
    id: 'mission-2',
    title: 'Cloud Infrastructure Attack',
    description: 'A cloud-native application with microservices architecture. Attackers must find weaknesses in the API and infrastructure, while defenders must protect the cloud environment.',
    backstory: 'CloudTech Solutions runs a critical SaaS platform on AWS. Recent intelligence suggests threat actors are targeting their API endpoints. As Red Team, exploit misconfigurations and vulnerabilities to gain access to user data. As Blue Team, secure the cloud infrastructure and prevent data exfiltration.',
    difficulty: 'medium',
    timeLimit: 420, // 7 minutes
    targetSystem: '172.16.0.10 (Cloud Application)',
    pointsToWin: 600,
    objectives: [
      { id: 'obj-1', description: 'Discover API endpoints and services', role: 'attacker', points: 60, completed: false, completedBy: null },
      { id: 'obj-2', description: 'Find SSRF vulnerability in API', role: 'attacker', points: 120, completed: false, completedBy: null },
      { id: 'obj-3', description: 'Exploit unauthenticated Redis instance', role: 'attacker', points: 150, completed: false, completedBy: null },
      { id: 'obj-4', description: 'Access sensitive data via IDOR', role: 'attacker', points: 180, completed: false, completedBy: null },
      { id: 'obj-5', description: 'Detect anomalous API traffic patterns', role: 'defender', points: 60, completed: false, completedBy: null },
      { id: 'obj-6', description: 'Restrict Redis access with firewall rules', role: 'defender', points: 100, completed: false, completedBy: null },
      { id: 'obj-7', description: 'Implement rate limiting on API endpoints', role: 'defender', points: 120, completed: false, completedBy: null },
      { id: 'obj-8', description: 'Secure admin panel and rotate credentials', role: 'defender', points: 140, completed: false, completedBy: null },
    ],
    vulnerabilities: generateVulnerabilities('mission-2'),
    networkMap: MISSION_2_NETWORK,
  },
  {
    id: 'mission-3',
    title: 'Advanced Persistent Threat',
    description: 'An APT group has been detected in the network. Defenders must hunt them down while attackers attempt to maintain persistence and exfiltrate data.',
    backstory: 'NATO Cyber Defense Center has detected signs of an Advanced Persistent Threat (APT) in their training network. The threat actor, known as "Shadow Bear", has established a foothold and is attempting lateral movement. Blue Team must hunt and eliminate the threat. Red Team plays as Shadow Bear, attempting to maintain access and exfiltrate classified documents.',
    difficulty: 'hard',
    timeLimit: 600, // 10 minutes
    targetSystem: '192.168.1.0/24 (Classified Network)',
    pointsToWin: 800,
    objectives: [
      { id: 'obj-1', description: 'Perform lateral movement to reach the target', role: 'attacker', points: 80, completed: false, completedBy: null },
      { id: 'obj-2', description: 'Establish persistence mechanisms', role: 'attacker', points: 120, completed: false, completedBy: null },
      { id: 'obj-3', description: 'Escalate privileges to admin level', role: 'attacker', points: 150, completed: false, completedBy: null },
      { id: 'obj-4', description: 'Exfiltrate classified documents', role: 'attacker', points: 250, completed: false, completedBy: null },
      { id: 'obj-5', description: 'Identify the initial compromise vector', role: 'defender', points: 80, completed: false, completedBy: null },
      { id: 'obj-6', description: 'Detect lateral movement indicators', role: 'defender', points: 100, completed: false, completedBy: null },
      { id: 'obj-7', description: 'Find and remove persistence mechanisms', role: 'defender', points: 150, completed: false, completedBy: null },
      { id: 'obj-8', description: 'Isolate compromised systems and recover', role: 'defender', points: 200, completed: false, completedBy: null },
    ],
    vulnerabilities: generateVulnerabilities('mission-3'),
    networkMap: MISSION_1_NETWORK,
  },
];

// ==========================================
// TOOL SIMULATION RESULTS
// ==========================================

export function simulateToolAction(
  toolId: string,
  role: PlayerRole,
  target?: string,
  _randomSeed?: number,
): ToolResult {
  const rand = Math.random();

  switch (toolId) {
    // ATTACKER TOOLS
    case 'nmap':
      return simulateNmapScan(rand);
    case 'burp-suite':
      return simulateBurpSuite(rand);
    case 'sql-injection':
      return simulateSQLInjection(rand);
    case 'metasploit':
      return simulateMetasploit(rand, target);
    case 'hydra':
      return simulateHydra(rand, target);
    case 'nikto':
      return simulateNikto(rand);

    // DEFENDER TOOLS
    case 'wireshark':
      return simulateWireshark(rand);
    case 'firewall':
      return simulateFirewall(rand);
    case 'snort':
      return simulateSnort(rand);
    case 'log-analyzer':
      return simulateLogAnalyzer(rand);
    case 'patch-manager':
      return simulatePatchManager(rand, target);
    case 'fail2ban':
      return simulateFail2ban(rand);

    default:
      return {
        success: false,
        message: 'Unknown tool',
        terminalOutput: ['Error: Tool not found'],
        points: 0,
      };
  }
}

function simulateNmapScan(rand: number): ToolResult {
  const scanTypes = [
    {
      output: [
        'Starting Nmap 7.93 ( https://nmap.org )',
        'Nmap scan report for target (10.0.0.10)',
        'Host is up (0.0034s latency).',
        'Not shown: 995 filtered ports',
        'PORT     STATE SERVICE     VERSION',
        '22/tcp   open  ssh         OpenSSH 7.4 (protocol 2.0)',
        '21/tcp   open  ftp         vsftpd 2.3.4',
        '80/tcp   open  http        Apache httpd 2.4.49',
        '443/tcp  open  ssl/https   OpenSSL 1.0.1e',
        '8080/tcp open  http-proxy  phpMyAdmin 4.6.6',
        '',
        'Service detection performed.',
        'Nmap done: 1 IP address (1 host up) scanned in 12.45 seconds',
      ],
      discoveries: ['Open SSH on port 22', 'Apache 2.4.49 on port 80', 'phpMyAdmin on port 8080', 'vsftpd on port 21'],
      points: 50,
    },
    {
      output: [
        'Starting Nmap 7.93 ( https://nmap.org )',
        'Nmap scan report for target (10.0.0.10)',
        'Host is up (0.0051s latency).',
        'Scanning top 1000 ports...',
        'PORT     STATE SERVICE    VERSION',
        '80/tcp   open  http       Apache httpd 2.4.49',
        '443/tcp  open  https      OpenSSL 1.0.1e',
        '3306/tcp open  mysql      MySQL 5.7.36',
        '',
        'OS detection: Linux 5.4 (Ubuntu)',
        'Nmap done: 1 IP address (1 host up) scanned in 8.23 seconds',
      ],
      discoveries: ['MySQL on port 3306', 'Apache on port 80', 'OpenSSL 1.0.1e (potentially vulnerable)'],
      points: 40,
    },
  ];

  const scan = scanTypes[Math.floor(rand * scanTypes.length)];
  return {
    success: true,
    message: 'Network scan completed successfully',
    terminalOutput: scan.output,
    points: scan.points,
    discoveries: scan.discoveries,
    vulnerabilities: rand > 0.5
      ? ['Apache 2.4.49 - Path Traversal (CVE-2021-41773)', 'OpenSSL 1.0.1e - Heartbleed']
      : [],
  };
}

function simulateBurpSuite(rand: number): ToolResult {
  if (rand > 0.3) {
    return {
      success: true,
      message: 'Request intercepted and analyzed',
      terminalOutput: [
        '[*] Burp Suite Professional v2023.12',
        '[*] Intercepting proxy running on 127.0.0.1:8080',
        '[*] Analyzing HTTP requests to target...',
        '',
        'GET /login HTTP/1.1',
        'Host: 10.0.0.10',
        'Cookie: session=abc123; role=user',
        'X-Forwarded-For: 192.168.1.50',
        '',
        '🔍 Analysis Results:',
        '  - Cookie contains session ID (can be hijacked)',
        '  - No CSRF token found in forms',
        '  - Login form accepts unsanitized input',
        '  - Directory listing enabled on /backup/',
        '  - Hidden parameter "admin=true" found in request',
        '',
        '[!] VULNERABILITY: Missing input validation on login form',
        '[!] VULNERABILITY: Insecure cookie configuration',
        '[!] INFO: Backup directory accessible without auth',
      ],
      points: 60,
      discoveries: ['CSRF vulnerability', 'Session hijacking possible', 'Unsanitized input'],
      vulnerabilities: ['SQL Injection in login form', 'Insecure cookie handling'],
    };
  }
  return {
    success: false,
    message: 'Interception blocked by WAF',
    terminalOutput: [
      '[*] Burp Suite Professional v2023.12',
      '[*] Attempting to intercept request...',
      '',
      '[!] ERROR: Connection reset by peer',
      '[!] The target has detected the proxy',
      '[!] WAF rule triggered: Suspicious proxy detected',
      '',
      '💡 TIP: Try using different headers or timing',
    ],
    points: 10,
  };
}

function simulateSQLInjection(rand: number): ToolResult {
  if (rand > 0.35) {
    return {
      success: true,
      message: 'SQL Injection attack successful!',
      terminalOutput: [
        '[*] SQL Injection Tool v2.0',
        '[*] Target: 10.0.0.10/login.php',
        '[*] Testing injection points...',
        '',
        '[+] Payload: \' OR 1=1 --',
        '[+] Status: SUCCESS! Bypassed authentication',
        '',
        '[*] Enumerating database...',
        '[+] Database: corporate_db',
        '[+] Tables:',
        '    - users (id, username, password_hash, role)',
        '    - customers (id, name, email, ssn, credit_card)',
        '    - transactions (id, amount, date, account_id)',
        '    - api_keys (id, key, service, permissions)',
        '',
        '[+] Extracting admin credentials...',
        '[+] admin:$2b$12$LJ3m... (bcrypt hash)',
        '',
        '🚩 FLAG CAPTURED: FLAG{sql_m4st3r_2024}',
      ],
      points: 150,
      vulnerabilities: ['SQL Injection in login form'],
      discoveries: ['Database structure exposed', 'Admin credentials found', 'Customer data accessible'],
    };
  }
  return {
    success: false,
    message: 'SQL Injection was blocked',
    terminalOutput: [
      '[*] SQL Injection Tool v2.0',
      '[*] Target: 10.0.0.10/login.php',
      '[*] Testing: \' OR 1=1 --',
      '',
      '[!] ERROR: WAF blocked the request',
      '[!] Detected pattern: SQL injection attempt',
      '[!] Request logged and IP flagged',
      '',
      '[*] Trying: UNION SELECT...',
      '[!] ERROR: Parameterized query detected',
      '',
      '💡 The defender has patched this vulnerability!',
    ],
    points: 15,
  };
}

function simulateMetasploit(rand: number, target?: string): ToolResult {
  const targets = ['22/ssh', '80/http', '8080/phpmyadmin'];
  const tgt = target || targets[Math.floor(rand * targets.length)];

  if (rand > 0.4) {
    return {
      success: true,
      message: `Exploit successful on ${tgt}!`,
      terminalOutput: [
        '',
        '       =[ metasploit v6.3.44-dev ]',
        '+ -- --=[ 2345 exploits - 1232 auxiliary ]',
        '+ -- --=[ 413 payloads - 46 encoders ]',
        '',
        `msf6 > use exploit/${tgt.includes('ssh') ? 'unix/ssh/openssh_auth_bypass' : 'multi/http/apache_mod_cgi_bash_env_exec'}`,
        `msf6 exploit(*) > set RHOSTS 10.0.0.10`,
        `msf6 exploit(*) > set TARGET ${tgt}`,
        'msf6 exploit(*) > exploit',
        '',
        `[*] Started reverse TCP handler on 10.0.0.5:4444`,
        `[*] Sending exploit to ${tgt}...`,
        `[*] Command Stager progress - 100.00% done (1097/1097 bytes)`,
        `[*] Meterpreter session 1 opened (10.0.0.5:4444 -> 10.0.0.10:49312)`,
        '',
        'meterpreter > sysinfo',
        'Computer    : WEB-SERVER',
        'OS          : Ubuntu 20.04 (Linux 5.4.0-91-generic)',
        'Architecture: x64',
        '',
        'meterpreter > shell',
        'whoami',
        'www-data',
        '',
        '🚩 SYSTEM COMPROMISED! Privilege escalation needed for root.',
      ],
      points: 120,
      discoveries: ['Shell access obtained', 'Web server compromised'],
      vulnerabilities: ['OpenSSH auth bypass', 'Apache CGI bash exploit'],
    };
  }
  return {
    success: false,
    message: 'Exploit failed - target patched',
    terminalOutput: [
      '',
      '       =[ metasploit v6.3.44-dev ]',
      '',
      `msf6 > use exploit/${tgt.includes('ssh') ? 'unix/ssh/openssh_auth_bypass' : 'multi/http/apache_mod_cgi_bash_env_exec'}`,
      `msf6 exploit(*) > set RHOSTS 10.0.0.10`,
      'msf6 exploit(*) > exploit',
      '',
      `[*] Started reverse TCP handler on 10.0.0.5:4444`,
      `[*] Sending exploit...`,
      `[-] Exploit failed: The service has been patched`,
      `[-] Target is running updated version`,
      '',
      '💡 The defender has already patched this vulnerability',
      '💡 Try a different exploit or target',
    ],
    points: 10,
  };
}

function simulateHydra(rand: number, target?: string): ToolResult {
  const targets = target || 'SSH (port 22)';

  if (rand > 0.3) {
    return {
      success: true,
      message: 'Password found via brute force!',
      terminalOutput: [
        '[*] Hydra v9.5 (c) 2023 by van Hauser',
        `[Hydra] target: ${targets}`,
        '[Hydra] Using wordlist: rockyou.txt (14344399 entries)',
        '[Hydra] Trying passwords...',
        '',
        '[ATTEMPT] target 10.0.0.10 - login "admin" - pass "admin123" - 1 of 14344399',
        '[ATTEMPT] target 10.0.0.10 - login "admin" - pass "password" - 2 of 14344399',
        '[ATTEMPT] target 10.0.0.10 - login "admin" - pass "123456" - 3 of 14344399',
        '...',
        '[ATTEMPT] target 10.0.0.10 - login "admin" - pass "cybercorp2024" - 15847 of 14344399',
        '',
        '[22][ssh] host: 10.0.0.10   login: admin   password: cybercorp2024',
        '',
        '[STATUS] attack finished for 10.0.0.10 (valid pair found)',
        '',
        '🔑 Credentials: admin:cybercorp2024',
      ],
      points: 80,
      discoveries: ['SSH credentials found', 'Weak password policy detected'],
    };
  }
  return {
    success: false,
    message: 'Brute force blocked - account locked',
    terminalOutput: [
      '[*] Hydra v9.5 (c) 2023 by van Hauser',
      `[Hydra] target: ${targets}`,
      '[Hydra] Using wordlist: rockyou.txt',
      '',
      '[ATTEMPT] target 10.0.0.10 - login "admin" - pass "admin123" - 1 of 14344399',
      '[ATTEMPT] target 10.0.0.10 - login "admin" - pass "password" - 2 of 14344399',
      '',
      '[!] ERROR: Account locked after 2 failed attempts',
      '[!] IP temporarily blocked by fail2ban',
      '',
      '💡 The defender has rate limiting enabled',
    ],
    points: 10,
  };
}

function simulateNikto(rand: number): ToolResult {
  return {
    success: true,
    message: 'Web vulnerability scan completed',
    terminalOutput: [
      '- Nikto v2.5.0',
      '---------------------------------------------------------------------------',
      '+ Target IP:          10.0.0.10',
      '+ Target Hostname:    web-server.cybercorp.local',
      '+ Target Port:        80',
      '+ Start Time:         2024-01-15 14:32:01 (GMT)',
      '---------------------------------------------------------------------------',
      '+ Server: Apache/2.4.49 (Ubuntu)',
      '+ /: The X-Content-Type-Options header is not set.',
      '+ /: The X-XSS-Protection header is not defined.',
      '+ /: Directory indexing found.',
      '+ /admin/: Admin panel found (requires authentication).',
      '+ /backup/: Backup directory accessible.',
      '+ /config.php: Config file may be accessible.',
      '+ /phpinfo.php: PHP info page found (information disclosure).',
      '+ Apache/2.4.49 appears outdated (CVE-2021-41773)',
      '+ /cgi-bin/: CGI scripts directory found.',
      '+ OSVDB-0000: GET /icons/README: Apache default file found.',
      '',
      `+ ${Math.floor(rand * 5) + 7} host(s) tested in ${Math.floor(rand * 10) + 5} seconds`,
      `+ ${Math.floor(rand * 8) + 3} vulnerability(ies) found`,
    ],
    points: 45,
    discoveries: ['Directory listing enabled', 'PHP info disclosure', 'CGI directory found', 'Admin panel detected'],
    vulnerabilities: ['Apache CVE-2021-41773', 'Missing security headers', 'Backup directory exposed'],
  };
}

// DEFENDER TOOLS

function simulateWireshark(rand: number): ToolResult {
  if (rand > 0.25) {
    return {
      success: true,
      message: 'Suspicious traffic detected!',
      terminalOutput: [
        '[*] Wireshark 4.2.0 - Packet Capture',
        '[*] Interface: eth0 (10.0.0.0/24)',
        '[*] Capture started...',
        '',
        'No.  Time     Source          Destination     Protocol  Info',
        '1    0.000    10.0.0.5       10.0.0.10       TCP       49312 → 80 [SYN]',
        '2    0.001    10.0.0.10      10.0.0.5        TCP       80 → 49312 [SYN,ACK]',
        '3    0.002    10.0.0.5       10.0.0.10       TCP       49312 → 80 [ACK]',
        '4    0.003    10.0.0.5       10.0.0.10       HTTP      GET /login HTTP/1.1',
        '5    0.015    10.0.0.5       10.0.0.10       HTTP      POST /login (SQL: \' OR 1=1)',
        '6    0.020    10.0.0.5       10.0.0.10       TCP       Multiple SYN packets (scan detected)',
        '7    0.025    10.0.0.5       10.0.0.10       TCP       49313 → 22 [SYN]',
        '8    0.030    10.0.0.5       10.0.0.10       TCP       49314 → 21 [SYN]',
        '9    0.035    10.0.0.5       10.0.0.10       TCP       49315 → 443 [SYN]',
        '10   0.040    10.0.0.5       10.0.0.10       TCP       49316 → 8080 [SYN]',
        '',
        '🚨 ALERT: NMAP scan pattern detected from 10.0.0.5',
        '🚨 ALERT: SQL injection attempt in HTTP POST to /login',
        '🚨 ALERT: Sequential port scan (ports 21,22,80,443,8080)',
      ],
      points: 50,
      discoveries: ['Attacker IP identified: 10.0.0.5', 'SQL injection attempt detected', 'Port scan detected'],
      attacksBlocked: [],
    };
  }
  return {
    success: true,
    message: 'Traffic appears normal',
    terminalOutput: [
      '[*] Wireshark 4.2.0 - Packet Capture',
      '[*] Interface: eth0 (10.0.0.0/24)',
      '',
      'No.  Time     Source          Destination     Protocol  Info',
      '1    0.000    10.0.0.100     10.0.0.10       TCP       HTTPS traffic',
      '2    0.005    10.0.0.10      10.0.0.100      TCP       HTTPS response',
      '3    0.010    10.0.0.50      10.0.0.20       TCP       MySQL query',
      '',
      '[*] No suspicious activity detected in this capture window',
      '[*] Continue monitoring...',
    ],
    points: 15,
  };
}

function simulateFirewall(rand: number): ToolResult {
  if (rand > 0.2) {
    return {
      success: true,
      message: 'Firewall rules updated successfully',
      terminalOutput: [
        '[*] Firewall Manager v3.2',
        '[*] Current rules:',
        '  RULE 1: ALLOW TCP 80 (HTTP) from ANY',
        '  RULE 2: ALLOW TCP 443 (HTTPS) from ANY',
        '  RULE 3: ALLOW TCP 22 (SSH) from 10.0.0.0/24',
        '',
        '[*] Adding new rules...',
        '  [+] BLOCK IP 10.0.0.5 (Known attacker)',
        '  [+] BLOCK TCP 21 (FTP) from ANY',
        '  [+] RATE LIMIT TCP 80 (Max 100 req/min)',
        '  [+] DROP ICMP (Ping sweep protection)',
        '',
        '[✓] Rules applied successfully',
        '[✓] Active connections from 10.0.0.5 terminated',
        '[✓] Firewall now blocking 1 hostile IP',
      ],
      points: 70,
      attacksBlocked: ['Blocked IP 10.0.0.5', 'FTP port closed', 'Rate limiting enabled'],
    };
  }
  return {
    success: false,
    message: 'Firewall rule conflict detected',
    terminalOutput: [
      '[*] Firewall Manager v3.2',
      '[*] Attempting to add rules...',
      '',
      '[!] ERROR: Rule conflict detected',
      '[!] Cannot block 10.0.0.5 - IP is in whitelist',
      '[!] Existing rule takes precedence',
      '',
      '💡 Remove whitelist entry first, then apply block rule',
    ],
    points: 10,
  };
}

function simulateSnort(rand: number): ToolResult {
  if (rand > 0.25) {
    return {
      success: true,
      message: 'IDS rules configured and alerts triggered',
      terminalOutput: [
        '[*] Snort 3.1.28.0 - Intrusion Detection System',
        '[*] Loading rules...',
        '',
        '[+] RULE: alert tcp any any -> 10.0.0.10 80 (msg:"SQL Injection Attempt"; content:"OR 1=1"; sid:1000001;)',
        '[+] RULE: alert tcp any any -> 10.0.0.10 22 (msg:"SSH Brute Force"; threshold:type both, track by_src, count 5, seconds 60; sid:1000002;)',
        '[+] RULE: alert tcp any any -> any any (msg:"NMAP Scan Detected"; flags:S; threshold:type both, track by_src, count 10, seconds 30; sid:1000003;)',
        '',
        '[*] Monitoring traffic...',
        '',
        '🔔 [**] [1:1000001:1] SQL Injection Attempt [**]',
        '    [Priority: 1] {TCP} 10.0.0.5:49312 -> 10.0.0.10:80',
        '    [Classification: Web Application Attack] [Priority: 1]',
        '',
        '🔔 [**] [1:1000003:3] NMAP Scan Detected [**]',
        '    [Priority: 1] {TCP} 10.0.0.5 -> 10.0.0.10',
        '    [Classification: Attempted Information Leak] [Priority: 2]',
        '',
        '[*] 2 alerts triggered in the last 60 seconds',
      ],
      points: 60,
      discoveries: ['SQL injection alert configured', 'Brute force detection active', 'Scan detection enabled'],
      attacksBlocked: ['SQL injection detected and logged', 'Port scan pattern identified'],
    };
  }
  return {
    success: true,
    message: 'IDS monitoring active - no new alerts',
    terminalOutput: [
      '[*] Snort 3.1.28.0 - Intrusion Detection System',
      '[*] Rules loaded: 3 active',
      '',
      '[*] Monitoring traffic on eth0...',
      '[*] No new alerts in this cycle',
      '[*] Last alert: 120 seconds ago',
      '',
      '[✓] System is clean',
    ],
    points: 20,
  };
}

function simulateLogAnalyzer(rand: number): ToolResult {
  if (rand > 0.3) {
    return {
      success: true,
      message: 'Anomalies found in system logs',
      terminalOutput: [
        '[*] System Log Analyzer v2.0',
        '[*] Analyzing logs from last 24 hours...',
        '',
        '=== AUTH LOG ===',
        'Jan 15 14:30:01 sshd[1234]: Failed password for admin from 10.0.0.5 port 49312 ssh2',
        'Jan 15 14:30:05 sshd[1235]: Failed password for admin from 10.0.0.5 port 49313 ssh2',
        'Jan 15 14:30:09 sshd[1236]: Failed password for root from 10.0.0.5 port 49314 ssh2',
        '',
        '=== APACHE ACCESS LOG ===',
        '10.0.0.5 - - [15/Jan/2024:14:31:00] "GET /admin HTTP/1.1" 403 1284',
        '10.0.0.5 - - [15/Jan/2024:14:31:05] "POST /login HTTP/1.1" 200 512',
        '10.0.0.5 - - [15/Jan/2024:14:31:10] "GET /backup/ HTTP/1.1" 200 2048',
        '',
        '=== MYSQL LOG ===',
        '15T14:31:06.123456Z 42 Connect admin@10.0.0.5 on corporate_db',
        '15T14:31:06.234567Z 42 Query SELECT * FROM users WHERE 1=1 --',
        '',
        '🚨 ANOMALIES DETECTED:',
        '  - Multiple failed SSH logins from 10.0.0.5',
        '  - Access to /backup/ directory (should be restricted)',
        '  - SQL injection pattern in MySQL query log',
        '  - Suspicious user enumeration in /admin endpoint',
      ],
      points: 55,
      discoveries: ['Brute force attempt logged', 'Backup directory accessed', 'SQL injection in DB logs'],
      attacksBlocked: [],
    };
  }
  return {
    success: true,
    message: 'Logs are clean - no anomalies',
    terminalOutput: [
      '[*] System Log Analyzer v2.0',
      '[*] Analyzing logs...',
      '',
      '=== AUTH LOG ===',
      'Normal login activity detected. No anomalies.',
      '',
      '=== APACHE LOG ===',
      'Standard HTTP requests. All 200/304 responses.',
      '',
      '[*] No suspicious activity found in current logs',
    ],
    points: 20,
  };
}

function simulatePatchManager(rand: number, target?: string): ToolResult {
  const patches = [
    { name: 'Apache 2.4.49 → 2.4.58', vuln: 'CVE-2021-41773' },
    { name: 'OpenSSL 1.0.1e → 3.0.11', vuln: 'Heartbleed' },
    { name: 'phpMyAdmin 4.6.6 → 5.2.1', vuln: 'Auth bypass' },
    { name: 'OpenSSH 7.4 → 9.5p1', vuln: 'Auth bypass' },
    { name: 'vsftpd 2.3.4 → 3.0.5', vuln: 'Backdoor' },
  ];

  const patch = target ? patches.find(p => p.name.toLowerCase().includes(target.toLowerCase())) || patches[Math.floor(rand * patches.length)] : patches[Math.floor(rand * patches.length)];

  if (rand > 0.2) {
    return {
      success: true,
      message: `Patched: ${patch.name}`,
      terminalOutput: [
        '[*] Patch Manager v1.5',
        '[*] Checking for available updates...',
        '',
        `[+] UPDATE AVAILABLE: ${patch.name}`,
        `[+] Fixes: ${patch.vuln}`,
        '',
        '[*] Downloading update...',
        '[*] Applying patch...',
        '[*] Verifying installation...',
        '',
        `[✓] ${patch.name} - Successfully patched`,
        `[✓] Service restarted successfully`,
        `[✓] Vulnerability ${patch.vuln} is now mitigated`,
        '',
        `[!] ${patches.length - 1} more patches available`,
      ],
      points: 80,
      attacksBlocked: [`${patch.vuln} patched`],
      vulnerabilities: [],
    };
  }
  return {
    success: false,
    message: 'Patch failed to apply',
    terminalOutput: [
      '[*] Patch Manager v1.5',
      '[*] Attempting to patch...',
      '',
      `[!] ERROR: Patch installation failed`,
      '[!] Dependency conflict detected',
      '[!] Service restart failed',
      '',
      '💡 Try patching a different service first',
    ],
    points: 5,
  };
}

function simulateFail2ban(rand: number): ToolResult {
  if (rand > 0.2) {
    return {
      success: true,
      message: 'Malicious IP banned successfully',
      terminalOutput: [
        '[*] Fail2Ban v1.0.2',
        '[*] Active jails: sshd, apache-auth, mysql-auth',
        '',
        '[*] Checking ban list...',
        '  Currently banned: 0 IPs',
        '',
        '[*] Monitoring authentication failures...',
        '[+] 5 failures from 10.0.0.5 in 60 seconds',
        '',
        '[*] Action: iptables-multiport',
        '  [+] Banning 10.0.0.5',
        '  [+] iptables -I f2b-sshd 1 -s 10.0.0.5 -j REJECT',
        '  [+] Banned IP added to jail: sshd',
        '',
        '[✓] IP 10.0.0.5 is now banned for 3600 seconds',
        '[✓] Active connections terminated',
      ],
      points: 65,
      attacksBlocked: ['IP 10.0.0.5 banned via fail2ban'],
    };
  }
  return {
    success: true,
    message: 'Fail2ban monitoring - no new threats',
    terminalOutput: [
      '[*] Fail2Ban v1.0.2',
      '[*] Active jails: sshd, apache-auth, mysql-auth',
      '',
      '[*] No new authentication failures detected',
      '[*] Currently banned: 0 IPs',
      '[*] System is secure',
    ],
    points: 15,
  };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generatePlayerId(): string {
  return 'player-' + Math.random().toString(36).substr(2, 9);
}

export function generateTeamId(): string {
  return 'team-' + Math.random().toString(36).substr(2, 9);
}

export function getRandomMission(): Mission {
  const idx = Math.floor(Math.random() * MISSIONS.length);
  return JSON.parse(JSON.stringify(MISSIONS[idx]));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const AVATARS = [
  '🛡️', '⚔️', '🔫', '🎯', '💀', '👾', '🤖', '🕵️',
  '🐉', '🦅', '🐍', '🦊', '🐺', '🦁', '🐙', '🦈',
];

export const TEAM_NAMES = [
  'Cyber Sharks', 'Byte Breakers', 'Net Guardians', 'Data Dragons',
  'Code Crusaders', 'Pixel Pirates', 'Firewall Force', 'Hack Hawks',
  'Root Rangers', 'Zero Day Zeroes', 'Payload Pandas', 'Binary Bears',
];
