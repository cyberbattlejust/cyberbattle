export const TRAINING_MISSIONS = [
  // Easy missions: 20 x 5 = 100 points
  {
    title: 'Nmap Open Port Count',
    description:
      'Recon brief: The target exposes multiple services. Use the network scan output to identify the attack surface.\n\nSubmit the count of services that are actually reachable.',
    type: 'attack',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: '4',
  },
  {
    title: 'Nmap SSH Port',
    description:
      'Recon brief: Remote administration is exposed somewhere in the scan results.\n\nSubmit the port number used by the SSH service.',
    type: 'attack',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: '22',
  },
  {
    title: 'Nmap HTTPS Port',
    description:
      'Recon brief: A secure web service is present in the service table.\n\nSubmit the port number assigned to HTTPS.',
    type: 'attack',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: '443',
  },
  {
    title: 'Nmap Database Service',
    description:
      'Recon brief: The database listener is visible in the scan output.\n\nSubmit the service name running on port 3306.',
    type: 'attack',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: 'MySQL',
  },
  {
    title: 'Wireshark Suspicious Protocol',
    description:
      'Traffic brief: One packet in the capture is clearly more suspicious than the rest.\n\nSubmit the protocol used by that suspicious packet.',
    type: 'attack',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: 'HTTP',
  },
  {
    title: 'Wireshark Suspicious Method',
    description:
      'Traffic brief: The suspicious packet contains an application-layer request.\n\nSubmit the HTTP method used in that request.',
    type: 'attack',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: 'POST',
  },
  {
    title: 'Burp Suspicious Method',
    description:
      'Proxy brief: The intercepted traffic includes one request that should not be ignored.\n\nSubmit the HTTP method used by the suspicious request.',
    type: 'attack',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: 'POST',
  },
  {
    title: 'Burp Suspicious Status',
    description:
      'Proxy brief: A suspicious request received a successful server response.\n\nSubmit the HTTP status code shown for that request.',
    type: 'attack',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: '200',
  },
  {
    title: 'Metasploit SMB Port',
    description:
      'Exploit-simulation brief: The SMB exposure module reports the affected service endpoint.\n\nSubmit the service port used by that module.',
    type: 'attack',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: '445',
  },
  {
    title: 'Metasploit FTP Port',
    description:
      'Exploit-simulation brief: The FTP review module identifies the service it is checking.\n\nSubmit the port number for that service.',
    type: 'attack',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: '21',
  },
  {
    title: 'CMD Gateway',
    description:
      'Host brief: The workstation network configuration reveals its route out of the local segment.\n\nSubmit the default gateway address for your team machine.',
    type: 'defense',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: '192.168.1.1',
  },
  {
    title: 'CMD Firewall State',
    description:
      'Host brief: The firewall profile summary shows whether filtering is enabled.\n\nSubmit the state value reported for the profiles.',
    type: 'defense',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: 'ON',
  },
  {
    title: 'CMD Current User Prefix',
    description:
      'Host brief: The current account name follows the lab naming pattern.\n\nSubmit the first word before the hyphen in the username.',
    type: 'defense',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: 'team',
  },
  {
    title: 'CMD OS Name',
    description:
      'Host brief: System inventory exposes the operating system name.\n\nSubmit the full OS Name value.',
    type: 'defense',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: 'Microsoft Windows 11 Pro',
  },
  {
    title: 'Nessus Info Plugin',
    description:
      'Vulnerability brief: One informational Nessus entry identifies the scanner plugin.\n\nSubmit the plugin number for the SYN scanner entry.',
    type: 'defense',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: '100000',
  },
  {
    title: 'Nessus DNS Port',
    description:
      'Vulnerability brief: A DNS-related finding is present in the scan report.\n\nSubmit the port associated with that finding.',
    type: 'defense',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: '53',
  },
  {
    title: 'Malwarebytes Backdoor Status',
    description:
      'Endpoint brief: A remote-access backdoor simulator appears in the endpoint scan.\n\nSubmit the remediation status shown for that threat.',
    type: 'defense',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: 'Quarantined',
  },
  {
    title: 'Malwarebytes PUP Severity',
    description:
      'Endpoint brief: A bundled installer is classified in the scan results.\n\nSubmit its severity level.',
    type: 'defense',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: 'Medium',
  },
  {
    title: 'Burp Password Field',
    description:
      'Proxy brief: The suspicious request body contains redacted values but keeps field names visible.\n\nSubmit the field name associated with the new password value.',
    type: 'attack',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: 'new_password',
  },
  {
    title: 'CMD SSH Service Port',
    description:
      'Host brief: The built-in terminal scanner lists an SSH service.\n\nSubmit the port number for SSH.',
    type: 'defense',
    difficulty: 'easy',
    points: 5,
    durationSec: 120,
    answer: '22',
  },

  // Medium missions: 10 x 10 = 100 points
  {
    title: 'Nmap Filtered Port',
    description:
      'Recon brief: Not every discovered service is reachable. One row is filtered rather than open.\n\nSubmit the filtered port number.',
    type: 'attack',
    difficulty: 'medium',
    points: 10,
    durationSec: 150,
    answer: '8080',
  },
  {
    title: 'Nmap Critical Vulnerability',
    description:
      'Recon brief: The vulnerability summary includes one critical web issue.\n\nSubmit the vulnerability name exactly as shown.',
    type: 'attack',
    difficulty: 'medium',
    points: 10,
    durationSec: 150,
    answer: 'SQL Injection',
  },
  {
    title: 'Nmap SSH Vulnerability',
    description:
      'Recon brief: One high-severity finding is tied to SSH authentication.\n\nSubmit the full finding name.',
    type: 'attack',
    difficulty: 'medium',
    points: 10,
    durationSec: 150,
    answer: 'SSH Weak Credentials',
  },
  {
    title: 'Burp Suspicious Path',
    description:
      'Proxy brief: The suspicious request targets a sensitive API endpoint.\n\nSubmit only the URL path after the host name.',
    type: 'attack',
    difficulty: 'medium',
    points: 10,
    durationSec: 150,
    answer: '/api/password-reset',
  },
  {
    title: 'Metasploit Payload Type',
    description:
      'Exploit-simulation brief: The SMB module displays a lab payload reference.\n\nSubmit the payload type segment after windows/x64/.',
    type: 'attack',
    difficulty: 'medium',
    points: 10,
    durationSec: 150,
    answer: 'meterpreter',
  },
  {
    title: 'Metasploit Web Risk',
    description:
      'Exploit-simulation brief: The web framework review classifies the exposure level.\n\nSubmit the risk level shown by the module.',
    type: 'attack',
    difficulty: 'medium',
    points: 10,
    durationSec: 150,
    answer: 'High',
  },
  {
    title: 'CMD Suspicious Process',
    description:
      'Host brief: The process list includes a known offensive security framework.\n\nSubmit the process image name.',
    type: 'defense',
    difficulty: 'medium',
    points: 10,
    durationSec: 150,
    answer: 'metasploit.exe',
  },
  {
    title: 'Nessus Admin Plugin',
    description:
      'Vulnerability brief: Default administrative credentials are flagged in the report.\n\nSubmit the plugin number for that finding.',
    type: 'defense',
    difficulty: 'medium',
    points: 10,
    durationSec: 150,
    answer: '11219',
  },
  {
    title: 'Nessus DNS Remediation',
    description:
      'Vulnerability brief: The DNS cache snooping finding includes a remediation statement.\n\nSubmit the client group that should be allowed to use recursion.',
    type: 'defense',
    difficulty: 'medium',
    points: 10,
    durationSec: 150,
    answer: 'trusted internal clients',
  },
  {
    title: 'Malwarebytes Spyware Type',
    description:
      'Endpoint brief: A keylogger simulator appears in the scan results.\n\nSubmit the threat type shown for it.',
    type: 'defense',
    difficulty: 'medium',
    points: 10,
    durationSec: 150,
    answer: 'Spyware Simulator',
  },

  // Hard missions: 5 x 20 = 100 points
  {
    title: 'Capture the Flag',
    description:
      'Traffic brief: A suspicious HTTP packet contains a hidden Cyber Arena flag.\n\nSubmit the complete flag value exactly as captured.',
    type: 'attack',
    difficulty: 'hard',
    points: 20,
    durationSec: 180,
    answer: 'FLAG{p4ck3t_m4st3r}',
  },
  {
    title: 'Nmap Database Version',
    description:
      'Recon brief: The database service exposes a precise version string.\n\nSubmit the full version shown for port 3306.',
    type: 'attack',
    difficulty: 'hard',
    points: 20,
    durationSec: 180,
    answer: 'MySQL 8.0.32',
  },
  {
    title: 'CMD ARP Physical Address',
    description:
      'Host brief: The ARP cache contains a dynamic gateway entry.\n\nSubmit the physical address from the first dynamic entry.',
    type: 'defense',
    difficulty: 'hard',
    points: 20,
    durationSec: 180,
    answer: 'aa-bb-cc-11-22-33',
  },
  {
    title: 'Nessus Legacy SMB Finding',
    description:
      'Vulnerability brief: A critical SMB protocol exposure appears in the scan report.\n\nSubmit the full finding name.',
    type: 'defense',
    difficulty: 'hard',
    points: 20,
    durationSec: 180,
    answer: 'Legacy SMB Protocol Enabled',
  },
  {
    title: 'Malwarebytes Rootkit Threat',
    description:
      'Endpoint brief: A critical driver-level threat is detected under System32 drivers.\n\nSubmit the threat name.',
    type: 'defense',
    difficulty: 'hard',
    points: 20,
    durationSec: 180,
    answer: 'Rootkit.Driver.Sim',
  },
];
