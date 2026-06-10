'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import type { TeamId } from '@/components/game/types';

function normalizeTeamId(team: string): TeamId {
  if (team === 'teamA' || team === 'A') {
    return 'teamA';
  }

  return 'teamB';
}

function getTeamDisplayName(teamId: TeamId) {
  return teamId === 'teamA' ? 'AL-SHLOOL' : 'BANI-YASSEN';
}

function getTeamLabel(teamId: TeamId) {
  return teamId === 'teamA' ? 'AL-SHLOOL' : 'BANI YASSEN';
}

function getTeamNetworkNumber(teamId: TeamId) {
  return teamId === 'teamA' ? '1' : '2';
}

function getEnemyNetworkNumber(teamId: TeamId) {
  return teamId === 'teamA' ? '2' : '1';
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function CMDTool({ team }: { team: string }) {
  const teamId = useMemo(() => normalizeTeamId(team), [team]);
  const teamDisplayName = getTeamDisplayName(teamId);
  const teamLabel = getTeamLabel(teamId);
  const networkNumber = getTeamNetworkNumber(teamId);
  const enemyNetworkNumber = getEnemyNetworkNumber(teamId);

  const myIp = useMemo(() => {
    return teamId === 'teamA' ? '192.168.1.120' : '192.168.2.120';
  }, [teamId]);

  const myGateway = useMemo(() => {
    return teamId === 'teamA' ? '192.168.1.1' : '192.168.2.1';
  }, [teamId]);

  const prompt = useMemo(
    () => `C:\\Users\\${teamDisplayName}>`,
    [teamDisplayName],
  );

  const [lines, setLines] = useState<string[]>([
    'Microsoft Windows [Version 10.0.22631.4169]',
    '(c) Cyber Game Corporation. All rights reserved.',
    '',
    prompt,
  ]);

  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    setLines([
      'Microsoft Windows [Version 10.0.22631.4169]',
      '(c) Cyber Game Corporation. All rights reserved.',
      '',
      prompt,
    ]);
  }, [prompt]);

  const runCommand = useCallback(
    (cmd: string) => {
      const parts = cmd.trim().split(/\s+/);
      const command = parts[0]?.toLowerCase() || '';
      const args = parts.slice(1);

      const newLines: string[] = [`${prompt}${cmd}`];
      const enemyGateway = `192.168.${enemyNetworkNumber}.1`;

      switch (command) {
        case 'help':
          newLines.push(
            '',
            'Available commands:',
            '  help                 Show this help message',
            '  ipconfig             Display network configuration',
            '  ping <host>          Ping a host',
            '  tracert <host>       Trace route to host',
            '  netstat              Display network connections',
            '  arp -a               Display ARP cache',
            '  nslookup <host>      DNS lookup',
            '  whoami               Display current user',
            '  hostname             Display computer name',
            '  systeminfo           Display system information',
            '  tasklist             List running processes',
            '  net user             List users',
            '  dir                  List directory contents',
            '  cls                  Clear screen',
            '  echo <text>          Display a message',
            '  date                 Display current date',
            '  time                 Display current time',
            '  nmap <target>        Simulated network port scanner',
            '  ssh <host>           Simulated SSH connection test',
            '  ftp <host>           Simulated FTP connection test',
            '  netsh advfirewall    Show firewall status',
            '  getmac               Display MAC addresses',
            '  route print          Display routing table',
            '  wmic                 WMI information',
            '  powershell           Show simulated PowerShell output',
            '  curl <url>           Simulated HTTP request',
            '',
          );
          break;

        case 'ipconfig':
          newLines.push(
            '',
            'Windows IP Configuration',
            '',
            `Ethernet adapter Team ${teamLabel} Network:`,
            '',
            '   Connection-specific DNS Suffix  . : cyberarena.local',
            `   IPv4 Address. . . . . . . . . . . : ${myIp}`,
            '   Subnet Mask . . . . . . . . . . . : 255.255.255.0',
            `   Default Gateway . . . . . . . . . : ${myGateway}`,
            '',
          );
          break;

        case 'ping': {
          const target = args[0] || '127.0.0.1';
          const count = 4;

          newLines.push('', `Pinging ${target} with 32 bytes of data:`);

          for (let i = 0; i < count; i += 1) {
            const time = randomInt(1, 50);
            newLines.push(`Reply from ${target}: bytes=32 time=${time}ms TTL=64`);
          }

          newLines.push(
            '',
            `Ping statistics for ${target}:`,
            `    Packets: Sent = ${count}, Received = ${count}, Lost = 0 (0% loss)`,
          );
          break;
        }

        case 'tracert': {
          const target = args[0] || enemyGateway;

          newLines.push(
            '',
            `Tracing route to ${target} over a maximum of 30 hops:`,
            '',
          );

          const hops = randomInt(3, 6);

          for (let i = 1; i <= hops; i += 1) {
            const t1 = randomInt(5, 45);
            const t2 = t1 + randomInt(1, 10);
            const t3 = t2 + randomInt(1, 10);

            newLines.push(
              `  ${i}    ${t1} ms    ${t2} ms    ${t3} ms  192.168.${i}.${i}`,
            );
          }

          newLines.push('', 'Trace complete.');
          break;
        }

        case 'netstat':
          newLines.push(
            '',
            'Active Connections',
            '',
            '  Proto  Local Address          Foreign Address        State',
            '  TCP    0.0.0.0:80            0.0.0.0:0              LISTENING',
            '  TCP    0.0.0.0:443           0.0.0.0:0              LISTENING',
            `  TCP    ${myIp}:50000         ${enemyGateway}:445       ESTABLISHED`,
            `  TCP    ${myIp}:50001         142.250.80.46:443       ESTABLISHED`,
            '  TCP    0.0.0.0:22            0.0.0.0:0              LISTENING',
            '  UDP    0.0.0.0:5353          *:*',
          );
          break;

        case 'arp':
          if (args[0]?.toLowerCase() === '-a' || args.length === 0) {
            newLines.push(
              '',
              `Interface: ${myGateway} --- 0x3`,
              '',
              '  Internet Address      Physical Address      Type',
              `  ${myGateway}           aa-bb-cc-11-22-33     dynamic`,
              `  192.168.${networkNumber}.255         ff-ff-ff-ff-ff-ff     static`,
              `  ${myIp}         00-1a-2b-3c-4d-5e     dynamic`,
            );
          } else {
            newLines.push('Usage: arp -a');
          }
          break;

        case 'nslookup': {
          const target = args[0] || 'google.com';
          const ip = `${randomInt(10, 210)}.${randomInt(5, 250)}.${randomInt(
            5,
            250,
          )}.${randomInt(5, 250)}`;

          newLines.push(
            '',
            'Server:  dns.local',
            `Address:  ${myGateway}`,
            '',
            'Non-authoritative answer:',
            `Name:    ${target}`,
            `Address:  ${ip}`,
          );
          break;
        }

        case 'whoami':
          newLines.push(`team-${teamId === 'teamA' ? 'a' : 'b'}-agent`);
          break;

        case 'hostname':
          newLines.push(`DESKTOP-${teamDisplayName}-001`);
          break;

        case 'systeminfo':
          newLines.push(
            '',
            `Host Name:                 DESKTOP-${teamDisplayName}-001`,
            'OS Name:                   Microsoft Windows 11 Pro',
            'OS Version:                10.0.22631 N/A Build 22631',
            'System Type:               x64-based PC',
            `Network Card:              Team ${teamLabel} Network`,
            'Processor(s):              1 Processor(s) Installed.',
            'Total Physical Memory:     16,384 MB',
            'Available Physical Memory: 8,192 MB',
            '',
          );
          break;

        case 'tasklist':
          newLines.push(
            '',
            'Image Name                     PID Session Name        Mem Usage',
            '========================= ======== ================ ============',
            'System Idle Process              0 Services                 8 K',
            'System                           4 Services             3,200 K',
            'smss.exe                       356 Services               512 K',
            'csrss.exe                      524 Services             4,096 K',
            'wininit.exe                    612 Services             2,048 K',
            'explorer.exe                  1234 Console             128,000 K',
            'chrome.exe                    5678 Console             256,000 K',
            'wireshark.exe                 9012 Console             196,000 K',
            'nmap.exe                      9876 Console              64,000 K',
            'metasploit.exe                4321 Console             512,000 K',
            '',
          );
          break;

        case 'net':
          if (args[0]?.toLowerCase() === 'user') {
            newLines.push(
              '',
              'User accounts for \\\\DESKTOP-CYBER',
              '',
              '-------------------------------------------------------------------------------',
              'Administrator            Guest',
              `agent_${teamId}`,
              'system',
              '',
            );
          } else {
            newLines.push("The syntax of the command is incorrect. Try 'net user'.");
          }
          break;

        case 'dir':
          newLines.push(
            '',
            ' Volume in drive C has no label.',
            ' Volume Serial Number is ABCD-1234',
            '',
            ` Directory of C:\\Users\\${teamDisplayName}`,
            '',
            `${new Date().toLocaleDateString()}  ${new Date().toLocaleTimeString()}    <DIR>          .`,
            `${new Date().toLocaleDateString()}  ${new Date().toLocaleTimeString()}    <DIR>          ..`,
            `${new Date().toLocaleDateString()}  ${new Date().toLocaleTimeString()}    <DIR>          Desktop`,
            `${new Date().toLocaleDateString()}  ${new Date().toLocaleTimeString()}    <DIR>          Documents`,
            `${new Date().toLocaleDateString()}  ${new Date().toLocaleTimeString()}    <DIR>          Downloads`,
            `${new Date().toLocaleDateString()}  ${new Date().toLocaleTimeString()}             1,024 tools.exe`,
            `${new Date().toLocaleDateString()}  ${new Date().toLocaleTimeString()}             2,048 notes.txt`,
            '               2 File(s)          3,072 bytes',
            '               5 Dir(s)  50,000,000,000 bytes free',
            '',
          );
          break;

        case 'cls':
          setLines([prompt]);
          setInput('');
          return;

        case 'color':
          newLines.push('Color settings updated.');
          break;

        case 'echo':
          newLines.push(args.join(' ') || 'ECHO is on.');
          break;

        case 'date':
          newLines.push(
            `The current date is: ${new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}`,
          );
          break;

        case 'time':
          newLines.push(`The current time is: ${new Date().toLocaleTimeString()}`);
          break;

        case 'nmap': {
          const target = args[0] || enemyGateway;

          newLines.push(
            '',
            'Starting simulated Nmap 7.94 scan',
            `Nmap scan report for ${target}`,
            'Host is up (0.0034s latency).',
            '',
            'PORT     STATE     SERVICE     VERSION',
            '22/tcp   open      ssh         OpenSSH 8.9',
            '80/tcp   open      http        Apache 2.4.52',
            '443/tcp  open      https       Apache 2.4.52',
            '3306/tcp open      mysql       MySQL 8.0.32',
            '8080/tcp filtered  http-proxy  Squid 5.2',
            '',
            'Service detection performed.',
            'Nmap done: 1 IP address (1 host up) scanned in 8.42 seconds',
            '',
          );
          break;
        }

        case 'ssh': {
          const target = args[0] || enemyGateway;

          newLines.push(
            `Connecting to ${target}...`,
            `The authenticity of host '${target}' cannot be established in this simulation.`,
            'Connection timed out. Try again later.',
            '',
          );
          break;
        }

        case 'ftp': {
          const target = args[0] || enemyGateway;

          newLines.push(
            `Connected to ${target}.`,
            '220 FTP Server ready.',
            `Name (${target}:agent): anonymous`,
            '331 Please specify the password.',
            'Password: ********',
            '530 Login incorrect.',
            'Login failed.',
            'ftp>',
          );
          break;
        }

        case 'netsh':
          if (args[0]?.toLowerCase() !== 'advfirewall' && args.length > 0) {
            newLines.push('Supported simulation command: netsh advfirewall');
            break;
          }

          newLines.push(
            '',
            'Windows Advanced Firewall Configuration:',
            '',
            'Domain Profile Settings:',
            '  ------------------------------------------------------------------',
            '  State:                           ON',
            '  Inbound connections:             Block (default)',
            '  Outbound connections:            Allow (default)',
            '  Authorized applications:         14',
            '',
            'Private Profile Settings:',
            '  ------------------------------------------------------------------',
            '  State:                           ON',
            '  Firewall policy:                 BlockInbound,AllowOutbound',
            '  LocalFirewallRules:              87',
            '  LocalConSecRules:                0',
            '',
            'Public Profile Settings:',
            '  ------------------------------------------------------------------',
            '  State:                           ON',
            '  Firewall policy:                 BlockInbound,AllowOutbound',
            '',
          );
          break;

        case 'getmac':
          newLines.push(
            '',
            'Physical Address    Transport Address',
            '==================  ============================',
            `  ${
              teamId === 'teamA' ? 'AA-BB-CC-11-22-33' : 'DD-EE-FF-44-55-66'
            }   \\Device\\Tcpip_team_adapter`,
            '  AA-BB-CC-DD-EE-FF   \\Device\\Tcpip_virtual_adapter',
            '',
          );
          break;

        case 'route':
          if (args[0]?.toLowerCase() !== 'print' && args.length > 0) {
            newLines.push('Supported simulation command: route print');
            break;
          }

          newLines.push(
            '',
            'IPv4 Route Table',
            '===========================================================================',
            'Interface List',
            '  12...00 1a 2b 3c 4d 5e ......Team Network',
            '  1...........................Software Loopback Interface 1',
            '',
            'IPv4 Active Routes:',
            'Network Destination        Netmask          Gateway       Interface  Metric',
            `          0.0.0.0          0.0.0.0    ${myGateway}   ${myIp}     25`,
            '        127.0.0.0        255.0.0.0         On-link         127.0.0.1    331',
            `   192.168.${networkNumber}.0    255.255.255.0         On-link    ${myIp}    281`,
            '===========================================================================',
          );
          break;

        case 'wmic':
          newLines.push(
            '',
            'WMIC - Windows Management Instrumentation Command-line',
            '',
            'Common simulated output:',
            '  OS Name: Microsoft Windows 11 Pro',
            '  OS Version: 10.0.22631',
            '  BIOS SerialNumber: REDACTED-LAB-SERIAL',
            '  Network Adapter: Team Network Adapter',
            '',
          );
          break;

        case 'powershell':
          newLines.push(
            '',
            'Windows PowerShell',
            'Copyright (C) Microsoft Corporation. All rights reserved.',
            '',
            'PS C:\\Users\\Agent> Get-Process | Select-Object -First 5',
            '',
            'Handles  NPM(K)    PM(K)      WS(K)   CPU(s)     Id  SI ProcessName',
            '-------  ------    -----      -----   ------     --  -- -----------',
            '    354      18    32456      45678     2.34   1234   1 chrome',
            '    128      10    12840      18920     0.87   5678   1 explorer',
            '    256      12    98760     145678     5.21   9012   1 wireshark',
            '    192      15    65536      89012     1.56   3456   1 security-tool',
            '',
            'PS C:\\Users\\Agent> _',
          );
          break;

        case 'curl': {
          const target = args[0] || 'http://target.local';

          newLines.push(
            `GET ${target}`,
            '',
            '<!DOCTYPE HTML>',
            '<html>',
            '<head><title>Target Web Server</title></head>',
            '<body><h1>It works!</h1></body>',
            '</html>',
            '',
          );
          break;
        }

        case 'wget':
        case 'certutil':
        case 'hydra':
        case 'hashcat':
        case 'john':
        case 'aircrack-ng':
        case 'sqlmap':
          newLines.push(
            '',
            `The command "${command}" is disabled in this training terminal.`,
            'This simulation focuses on safe inspection, detection, and defensive analysis.',
            '',
          );
          break;

        default:
          newLines.push(
            `'${command}' is not recognized as an internal or external command,`,
            'operable program or batch file. Type "help" for available commands.',
          );
      }

      newLines.push('');
      setLines((prev) => [...prev, ...newLines]);
    },
    [
      enemyNetworkNumber,
      myGateway,
      myIp,
      networkNumber,
      prompt,
      teamDisplayName,
      teamId,
      teamLabel,
    ],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!input.trim()) {
      return;
    }

    setHistory((prev) => [...prev, input.trim()]);
    setHistoryIdx(-1);
    runCommand(input.trim());
    setInput('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();

      if (history.length === 0) {
        return;
      }

      const newIndex =
        historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);

      setHistoryIdx(newIndex);
      setInput(history[newIndex]);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      if (historyIdx === -1) {
        return;
      }

      const newIndex = historyIdx + 1;

      if (newIndex >= history.length) {
        setHistoryIdx(-1);
        setInput('');
        return;
      }

      setHistoryIdx(newIndex);
      setInput(history[newIndex]);
    }
  };

  return (
    <div className="space-y-3">
      <h3
        className="text-sm font-bold text-green-400"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        💻 Command Prompt
      </h3>

      <div
        className="max-h-[350px] overflow-y-auto rounded-lg border border-slate-800 bg-black p-3 font-mono text-[11px] text-green-400"
        onClick={() => document.getElementById('cmd-input')?.focus()}
      >
        {lines.map((line, index) => (
          <div
            key={`${line}-${index}`}
            className="whitespace-pre-wrap leading-relaxed"
          >
            {line || '\u00A0'}
          </div>
        ))}

        <div ref={endRef} />

        <form onSubmit={handleSubmit} className="flex items-center">
          <span className="mr-1 whitespace-pre text-green-400">{'>'}</span>

          <input
            id="cmd-input"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 border-none bg-transparent font-mono text-[11px] text-green-400 caret-green-400 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </form>
      </div>

      <p className="text-[9px] text-slate-600">
        💡 Type &quot;help&quot; for available commands. Use ↑↓ to navigate
        command history.
      </p>
    </div>
  );
}