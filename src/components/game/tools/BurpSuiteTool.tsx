'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type ProxyRequest = {
  id: number;
  method: string;
  url: string;
  status: number;
  size: number;
  suspicious: boolean;
  body?: string;
  note?: string;
};

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function sanitizeBody(body?: string) {
  if (!body) {
    return '';
  }

  return body
    .replace(/"token"\s*:\s*"[^"]*"/gi, '"token":"[REDACTED]"')
    .replace(/"new_password"\s*:\s*"[^"]*"/gi, '"new_password":"[REDACTED]"')
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[REDACTED]"')
    .replace(/"secret"\s*:\s*"[^"]*"/gi, '"secret":"[REDACTED]"');
}

export default function BurpSuiteTool() {
  const [requests, setRequests] = useState<ProxyRequest[]>([]);
  const [intercepted, setIntercepted] = useState<ProxyRequest | null>(null);
  const [capturing, setCapturing] = useState(false);

  const captureRequests = () => {
    if (capturing) {
      return;
    }

    setCapturing(true);
    setIntercepted(null);

    const methods = ['GET', 'POST', 'PUT'];
    const paths = [
      '/login',
      '/api/profile',
      '/admin',
      '/api/users',
      '/wp-admin',
      '/config',
    ];
    const statuses = [200, 403, 301, 404, 500];

    const normalRequests: ProxyRequest[] = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      method: randomItem(methods),
      url: `http://target.local${randomItem(paths)}`,
      status: randomItem(statuses),
      size: 100 + Math.floor(Math.random() * 5000),
      suspicious: false,
      note: 'Simulated HTTP request',
    }));

    const suspiciousRequest: ProxyRequest = {
      id: 9,
      method: 'POST',
      url: 'http://target.local/api/password-reset',
      status: 200,
      size: 342,
      suspicious: true,
      body: '{"token":"[REDACTED]","new_password":"[REDACTED]"}',
      note: 'Sensitive fields detected and redacted',
    };

    const capturedRequests = [...normalRequests, suspiciousRequest];

    setTimeout(() => {
      setRequests(capturedRequests);
      setCapturing(false);
      toast.info('Captured 9 simulated HTTP requests');
    }, 650);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-bold text-orange-300"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          🔒 Burp Suite - Web Proxy
        </h3>

        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={captureRequests}
          disabled={capturing}
          className="cursor-pointer rounded border-none bg-orange-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {capturing ? '⏳ Intercepting...' : '▶ Intercept Traffic'}
        </motion.button>
      </div>

      {capturing && (
        <div className="space-y-1">
          <div className="h-1 overflow-hidden rounded bg-slate-800">
            <motion.div
              className="h-full rounded bg-orange-500"
              animate={{ width: ['0%', '40%', '75%', '100%'] }}
              transition={{ duration: 0.65 }}
            />
          </div>

          <p className="animate-pulse text-[10px] text-orange-300">
            Intercepting simulated HTTP traffic...
          </p>
        </div>
      )}

      {requests.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto rounded-lg border border-slate-700">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 bg-slate-800">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                  #
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                  Method
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                  URL
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                  Status
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                  Size
                </th>
              </tr>
            </thead>

            <tbody className="font-mono">
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className={`cursor-pointer border-t border-slate-800/50 hover:bg-slate-800/30 ${
                    request.suspicious ? 'bg-yellow-900/10' : ''
                  }`}
                  onClick={() => {
                    if (request.suspicious) {
                      setIntercepted({
                        ...request,
                        body: sanitizeBody(request.body),
                      });
                    }
                  }}
                >
                  <td className="px-2 py-1 text-slate-500">{request.id}</td>

                  <td
                    className={`px-2 py-1 font-bold ${
                      request.method === 'POST'
                        ? 'text-orange-400'
                        : 'text-cyan-400'
                    }`}
                  >
                    {request.method}
                  </td>

                  <td className="max-w-[120px] truncate px-2 py-1 text-slate-300">
                    {request.url}
                  </td>

                  <td
                    className={`px-2 py-1 font-bold ${
                      request.status < 300
                        ? 'text-green-400'
                        : request.status < 400
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}
                  >
                    {request.status}
                  </td>

                  <td className="px-2 py-1 text-slate-400">
                    {request.size}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {intercepted && (
        <div className="space-y-1.5 rounded border border-yellow-800/20 bg-yellow-900/20 p-2.5">
          <p className="text-[10px] font-bold text-yellow-300">
            ⚠️ Suspicious Request Intercepted
          </p>

          <p className="font-mono text-[10px] text-slate-300">
            {intercepted.method} {intercepted.url}
          </p>

          {intercepted.body && (
            <p className="rounded bg-black/50 p-1.5 font-mono text-[10px] text-red-400">
              {sanitizeBody(intercepted.body)}
            </p>
          )}

          <p className="text-[10px] text-yellow-400">
            💡 Sensitive values are redacted. Use the visible field names and URL
            path for mission analysis.
          </p>
        </div>
      )}

      {!capturing && requests.length === 0 && (
        <div className="rounded border border-slate-800 bg-slate-950/60 p-3 text-[10px] text-slate-500">
          Start interception to inspect simulated HTTP requests.
        </div>
      )}
    </div>
  );
}
