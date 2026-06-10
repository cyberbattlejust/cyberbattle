export type MissionGuide = {
  tool: string;
  supervisorHint: string;
};

export const MISSION_GUIDES: Record<string, MissionGuide> = {
  'Nmap Open Port Count': {
    tool: 'Nmap',
    supervisorHint: 'Run the network scan and count only rows where STATE is open.',
  },
  'Nmap SSH Port': {
    tool: 'Nmap',
    supervisorHint: 'Run the network scan and inspect the ssh service row.',
  },
  'Nmap HTTPS Port': {
    tool: 'Nmap',
    supervisorHint: 'Run the network scan and inspect the https service row.',
  },
  'Nmap Database Service': {
    tool: 'Nmap',
    supervisorHint: 'Run the scan and inspect the service shown on port 3306.',
  },
  'Wireshark Suspicious Protocol': {
    tool: 'Wireshark',
    supervisorHint: 'Generate packets and inspect the row marked suspicious.',
  },
  'Wireshark Suspicious Method': {
    tool: 'Wireshark',
    supervisorHint: 'Open the suspicious packet info and read the request method.',
  },
  'Burp Suspicious Method': {
    tool: 'Burp Suite',
    supervisorHint: 'Intercept traffic and inspect the highlighted suspicious request.',
  },
  'Burp Suspicious Status': {
    tool: 'Burp Suite',
    supervisorHint: 'Intercept traffic and read the status code on the suspicious request.',
  },
  'Metasploit SMB Port': {
    tool: 'Metasploit',
    supervisorHint: 'Select SMB Exposure Assessment and read the affected service port.',
  },
  'Metasploit FTP Port': {
    tool: 'Metasploit',
    supervisorHint: 'Select FTP Anonymous Access Review and read the service port.',
  },
  'CMD Gateway': {
    tool: 'CMD',
    supervisorHint: 'Run ipconfig and read Default Gateway for the selected team.',
  },
  'CMD Firewall State': {
    tool: 'CMD',
    supervisorHint: 'Run netsh advfirewall and read the profile State value.',
  },
  'CMD Current User Prefix': {
    tool: 'CMD',
    supervisorHint: 'Run whoami and use the word before the hyphen.',
  },
  'CMD OS Name': {
    tool: 'CMD',
    supervisorHint: 'Run systeminfo and read OS Name exactly.',
  },
  'Nessus Info Plugin': {
    tool: 'Nessus',
    supervisorHint: 'Start a scan and find the informational SYN scanner plugin number.',
  },
  'Nessus DNS Port': {
    tool: 'Nessus',
    supervisorHint: 'Start a scan and inspect the DNS Server Cache Snooping finding.',
  },
  'Malwarebytes Backdoor Status': {
    tool: 'Malwarebytes',
    supervisorHint: 'Start an endpoint scan and inspect Backdoor.RemoteAccess.Sim status.',
  },
  'Malwarebytes PUP Severity': {
    tool: 'Malwarebytes',
    supervisorHint: 'Start an endpoint scan and inspect PUP.Optional.BundleInstaller severity.',
  },
  'Burp Password Field': {
    tool: 'Burp Suite',
    supervisorHint: 'Inspect the suspicious request body. Values are redacted, field names remain visible.',
  },
  'CMD SSH Service Port': {
    tool: 'CMD',
    supervisorHint: 'Run nmap from CMD and read the ssh row.',
  },
  'Nmap Filtered Port': {
    tool: 'Nmap',
    supervisorHint: 'Run the scan and identify the row where STATE is filtered.',
  },
  'Nmap Critical Vulnerability': {
    tool: 'Nmap',
    supervisorHint: 'Run the scan and inspect the critical vulnerability in the summary.',
  },
  'Nmap SSH Vulnerability': {
    tool: 'Nmap',
    supervisorHint: 'Run the scan and inspect the high SSH authentication finding.',
  },
  'Burp Suspicious Path': {
    tool: 'Burp Suite',
    supervisorHint: 'Intercept traffic and copy only the path from the suspicious request URL.',
  },
  'Metasploit Payload Type': {
    tool: 'Metasploit',
    supervisorHint: 'Run SMB Exposure Assessment and read the payload path segment after windows/x64.',
  },
  'Metasploit Web Risk': {
    tool: 'Metasploit',
    supervisorHint: 'Run Web Framework Exposure Review and read the risk field.',
  },
  'CMD Suspicious Process': {
    tool: 'CMD',
    supervisorHint: 'Run tasklist and find the offensive security process image.',
  },
  'Nessus Admin Plugin': {
    tool: 'Nessus',
    supervisorHint: 'Start a scan and inspect Default Administrative Credentials Detected.',
  },
  'Nessus DNS Remediation': {
    tool: 'Nessus',
    supervisorHint: 'Start a scan and read the remediation text for DNS cache snooping.',
  },
  'Malwarebytes Spyware Type': {
    tool: 'Malwarebytes',
    supervisorHint: 'Start a scan and inspect Spyware.Keylogger.Sim type.',
  },
  'Capture the Flag': {
    tool: 'Wireshark',
    supervisorHint: 'Generate packet capture, open the suspicious HTTP packet, and copy X-CyberArena-Flag.',
  },
  'Nmap Database Version': {
    tool: 'Nmap',
    supervisorHint: 'Run the network scan and read the VERSION column for port 3306.',
  },
  'CMD ARP Physical Address': {
    tool: 'CMD',
    supervisorHint: 'Run arp -a and read the physical address on the first dynamic entry.',
  },
  'Nessus Legacy SMB Finding': {
    tool: 'Nessus',
    supervisorHint: 'Start a scan and read the critical legacy SMB finding name.',
  },
  'Malwarebytes Rootkit Threat': {
    tool: 'Malwarebytes',
    supervisorHint: 'Start a scan and inspect the critical driver-level threat name.',
  },
};
