"use client"
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Copy, Check, ChevronDown, ChevronRight, Shield, Key, Users, Webhook, ExternalLink } from 'lucide-react'

const BASE_URL = 'https://streamvibe-website.vercel.app'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
interface Endpoint {
  id: string; method: Method; path: string; summary: string
  auth: 'none' | 'api-key'; permissions?: string[]
  description: string
  body?: { field: string; type: string; required: boolean; description: string }[]
  query?: { field: string; type: string; required: boolean; description: string }[]
  response: object; errorResponses?: { status: number; description: string }[]
}

const METHOD_COLORS: Record<Method, string> = {
  GET:    'bg-blue-900/60 text-blue-300 border-blue-700',
  POST:   'bg-green-900/60 text-green-300 border-green-700',
  PATCH:  'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  PUT:    'bg-orange-900/60 text-orange-300 border-orange-700',
  DELETE: 'bg-red-900/60 text-red-300 border-red-700',
}

const SECTIONS = [
  {
    id: 'auth', title: 'Authentication', icon: Shield,
    endpoints: [
      {
        id: 'verify-key', method: 'POST' as Method, path: '/api/v1/keys/verify',
        summary: 'Verify a license key', auth: 'none' as const,
        description: 'Validate a license key from your desktop application. No API key required. Optionally pass HWID to lock the key to a specific machine on first use.',
        body: [
          { field: 'key_code', type: 'string', required: true, description: 'The license key (e.g. SV-XXXX-XXXX-XXXX-XXXX)' },
          { field: 'hwid', type: 'string', required: false, description: 'Hardware ID to lock key to this machine' },
          { field: 'app_version', type: 'string', required: false, description: 'Your app version for telemetry' },
          { field: 'platform', type: 'string', required: false, description: 'Platform identifier (windows, android, etc.)' },
        ],
        response: { valid: true, key_code: 'SV-AB12-CD34-EF56-GH78', status: 'active', tier: 'pro', plan_name: 'Pro Monthly', features: ['Full StreamVibe Desktop', 'Unlimited profiles'], billing_interval: 'monthly', expires_at: '2026-04-09T00:00:00Z', hwid_locked: true, user_id: 'uuid...' },
        errorResponses: [
          { status: 400, description: 'Missing key_code' },
          { status: 403, description: 'Key is banned / inactive / expired / HWID mismatch' },
          { status: 404, description: 'Key not found' },
        ]
      },
    ]
  },
  {
    id: 'keys', title: 'License Keys', icon: Key,
    endpoints: [
      {
        id: 'keys-list', method: 'GET' as Method, path: '/api/v1/keys',
        summary: 'List license keys', auth: 'api-key' as const, permissions: ['keys:read'],
        description: 'Retrieve a paginated list of all license keys.',
        query: [
          { field: 'status', type: 'string', required: false, description: 'Filter by status: inactive | active | expired | banned' },
          { field: 'limit', type: 'number', required: false, description: 'Results per page (default: 50, max: 200)' },
          { field: 'offset', type: 'number', required: false, description: 'Pagination offset (default: 0)' },
        ],
        response: { total: 142, limit: 50, offset: 0, keys: [{ id: 'uuid', key_code: 'SV-AB12-CD34-EF56-GH78', status: 'active', plan_id: 'uuid', user_id: 'uuid', expires_at: null }] },
      },
      {
        id: 'keys-create', method: 'POST' as Method, path: '/api/v1/keys',
        summary: 'Create license keys', auth: 'api-key' as const, permissions: ['keys:create'],
        description: 'Generate one or more license keys. Keys are created with inactive status until redeemed.',
        body: [
          { field: 'quantity', type: 'number', required: false, description: 'Number of keys to generate (1â€“100, default: 1)' },
          { field: 'plan_id', type: 'string (uuid)', required: false, description: 'Assign to a specific plan' },
          { field: 'expires_at', type: 'string (ISO date)', required: false, description: 'Key expiry date' },
          { field: 'notes', type: 'string', required: false, description: 'Admin notes for this key' },
        ],
        response: { success: true, created: 3, keys: [{ id: 'uuid', key_code: 'SV-AB12-CD34-EF56-GH78', status: 'inactive' }] },
      },
      {
        id: 'keys-read', method: 'GET' as Method, path: '/api/v1/keys/:key_code',
        summary: 'Get key details', auth: 'api-key' as const, permissions: ['keys:read'],
        description: 'Get full details of a specific license key including plan info.',
        response: { id: 'uuid', key_code: 'SV-AB12-CD34-EF56-GH78', status: 'active', hwid: 'DESKTOP-ABC123', ip_address: '1.2.3.4', expires_at: null, plans: { name: 'Pro Monthly', tier: 'pro' } },
        errorResponses: [{ status: 404, description: 'Key not found' }]
      },
      {
        id: 'keys-modify', method: 'PATCH' as Method, path: '/api/v1/keys/:key_code',
        summary: 'Modify a key', auth: 'api-key' as const, permissions: ['keys:modify'],
        description: 'Update key properties or trigger actions like ban, unban, reset HWID, activate.',
        body: [
          { field: 'action', type: 'string', required: false, description: 'Shortcut action: ban | unban | activate | revoke | reset_hwid' },
          { field: 'status', type: 'string', required: false, description: 'Directly set status: inactive | active | expired | banned' },
          { field: 'plan_id', type: 'string (uuid)', required: false, description: 'Reassign to a different plan' },
          { field: 'user_id', type: 'string (uuid)', required: false, description: 'Link key to a user' },
          { field: 'hwid', type: 'string', required: false, description: 'Set or clear HWID (null to clear)' },
          { field: 'expires_at', type: 'string (ISO date)', required: false, description: 'Update expiry date' },
          { field: 'notes', type: 'string', required: false, description: 'Update admin notes' },
        ],
        response: { success: true, key: { id: 'uuid', key_code: 'SV-AB12-...', status: 'banned' } },
      },
      {
        id: 'keys-delete', method: 'DELETE' as Method, path: '/api/v1/keys/:key_code',
        summary: 'Delete a key', auth: 'api-key' as const, permissions: ['keys:modify'],
        description: 'Permanently delete a license key. This cannot be undone.',
        response: { success: true, deleted: 'SV-AB12-CD34-EF56-GH78' },
        errorResponses: [{ status: 404, description: 'Key not found' }]
      },
    ]
  },
  {
    id: 'users', title: 'Users', icon: Users,
    endpoints: [
      {
        id: 'users-read', method: 'GET' as Method, path: '/api/v1/users/:user_id',
        summary: 'Get user details', auth: 'api-key' as const, permissions: ['users:read'],
        description: 'Get a user profile with their active plans, license keys, and highest tier.',
        response: { id: 'uuid', username: 'streamer123', discord_user_id: '123456789', is_banned: false, highest_tier: 'pro', active_plans: [], license_keys: [] },
        errorResponses: [{ status: 404, description: 'User not found' }]
      },
      {
        id: 'users-modify', method: 'PATCH' as Method, path: '/api/v1/users/:user_id',
        summary: 'Modify a user', auth: 'api-key' as const, permissions: ['users:modify'],
        description: 'Update user profile, grant/revoke plans, or ban/unban a user.',
        body: [
          { field: 'action', type: 'string', required: false, description: 'Shortcut: ban | unban' },
          { field: 'username', type: 'string', required: false, description: 'Update username' },
          { field: 'discord_user_id', type: 'string', required: false, description: 'Link Discord account' },
          { field: 'is_banned', type: 'boolean', required: false, description: 'Ban or unban user' },
          { field: 'grant_plan_id', type: 'string (uuid)', required: false, description: 'Grant a plan to the user' },
          { field: 'revoke_plan_id', type: 'string (uuid)', required: false, description: 'Revoke a specific plan' },
        ],
        response: { success: true, profile: { id: 'uuid', username: 'streamer123', is_banned: false }, actions: 'ban' },
      },
    ]
  },
  {
    id: 'discord', title: 'Discord Sync', icon: Webhook,
    endpoints: [
      {
        id: 'discord-sync', method: 'POST' as Method, path: '/api/v1/discord/sync',
        summary: 'Sync Discord roles', auth: 'api-key' as const, permissions: ['discord:sync'],
        description: 'Sync a user\'s Discord server roles based on their StreamVibe plan tier. Adds the role matching their highest active tier, removes other tier roles.',
        body: [
          { field: 'discord_user_id', type: 'string', required: true, description: 'Discord user\'s snowflake ID' },
          { field: 'guild_id', type: 'string', required: true, description: 'Discord server (guild) ID' },
          { field: 'user_id', type: 'string (uuid)', required: false, description: 'StreamVibe user ID to look up tier from. If omitted, assigns free tier.' },
        ],
        response: { success: true, discord_user_id: '123456789', guild_id: '987654321', highest_tier: 'pro', roles_added: ['roleId_pro'], roles_removed: ['roleId_basic'] },
        errorResponses: [
          { status: 404, description: 'No Discord bot configured for this guild' },
          { status: 502, description: 'Discord API error' }
        ]
      },
      {
        id: 'discord-config-get', method: 'GET' as Method, path: '/api/v1/discord/config',
        summary: 'Get Discord config', auth: 'api-key' as const, permissions: ['discord:config'],
        description: 'Get the tierâ†’role mapping for a Discord guild.',
        query: [{ field: 'guild_id', type: 'string', required: false, description: 'Filter to a specific guild' }],
        response: { id: 'uuid', guild_id: '987654321', tier_role_map: { free: 'roleId1', basic: 'roleId2', pro: 'roleId3', legend: 'roleId4' } },
      },
      {
        id: 'discord-config-set', method: 'PUT' as Method, path: '/api/v1/discord/config',
        summary: 'Set Discord config', auth: 'api-key' as const, permissions: ['discord:config'],
        description: 'Configure bot token and tierâ†’role mappings for a Discord guild.',
        body: [
          { field: 'guild_id', type: 'string', required: true, description: 'Discord server (guild) ID' },
          { field: 'bot_token', type: 'string', required: false, description: 'Discord bot token with Manage Roles permission' },
          { field: 'tier_role_map', type: 'object', required: false, description: 'Map of tier name â†’ Discord role ID: { free, basic, pro, legend }' },
        ],
        response: { success: true, config: { guild_id: '987654321', tier_role_map: { pro: 'roleId3' } } },
      },
    ]
  },
  {
    id: 'apikeys', title: 'API Key Management', icon: Key,
    endpoints: [
      {
        id: 'apikeys-list', method: 'GET' as Method, path: '/api/v1/apikeys',
        summary: 'List API keys', auth: 'api-key' as const, permissions: ['admin'],
        description: 'List all API keys. Key hashes are never returned.',
        response: [{ id: 'uuid', name: 'Desktop App Key', key_prefix: 'sv_abc123', permissions: ['keys:read', 'keys:create'], is_active: true, last_used_at: '2026-03-09T06:00:00Z' }],
      },
      {
        id: 'apikeys-create', method: 'POST' as Method, path: '/api/v1/apikeys',
        summary: 'Create API key', auth: 'api-key' as const, permissions: ['admin'],
        description: 'Create a new API key. The raw key is returned ONCE and cannot be retrieved again.',
        body: [
          { field: 'name', type: 'string', required: true, description: 'Descriptive name for this key' },
          { field: 'permissions', type: 'string[]', required: false, description: 'Array of permissions. Valid: keys:read, keys:create, keys:modify, users:read, users:modify, discord:sync, discord:config, admin' },
          { field: 'expires_at', type: 'string (ISO date)', required: false, description: 'Optional expiry date' },
          { field: 'owner_user_id', type: 'string (uuid)', required: false, description: 'Associate with a StreamVibe user' },
        ],
        response: { success: true, message: 'Store this key securely â€” it will not be shown again.', api_key: 'sv_abc123def456...', key_prefix: 'sv_abc123', permissions: ['keys:read'] },
      },
    ]
  },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 bg-[#0d0d1a] hover:bg-[#12121e] text-left transition-colors">
        <span className={cn('text-xs font-extrabold px-2 py-0.5 rounded border font-mono min-w-[52px] text-center', METHOD_COLORS[ep.method])}>{ep.method}</span>
        <code className="text-slate-200 text-sm flex-1">{ep.path}</code>
        {ep.auth === 'api-key' && (
          <span className="hidden sm:inline text-xs px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800">ðŸ”‘ API Key</span>
        )}
        {ep.auth === 'none' && (
          <span className="hidden sm:inline text-xs px-2 py-0.5 rounded bg-green-900/40 text-green-300 border border-green-800">Public</span>
        )}
        <span className="text-slate-400 text-sm hidden md:inline">{ep.summary}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-slate-800 bg-[#0a0a12] p-5 space-y-5">
          <p className="text-slate-300 text-sm">{ep.description}</p>
          {ep.permissions && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-slate-500">Required permissions:</span>
              {ep.permissions.map(p => (
                <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-300 border border-amber-900 font-mono">{p}</span>
              ))}
            </div>
          )}
          {ep.query && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Query Parameters</p>
              <ParamTable params={ep.query} />
            </div>
          )}
          {ep.body && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Request Body (JSON)</p>
              <ParamTable params={ep.body} />
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Example Response</p>
              <CopyButton text={JSON.stringify(ep.response, null, 2)} />
            </div>
            <pre className="bg-[#060608] rounded-lg p-4 text-xs text-green-300 overflow-x-auto border border-slate-800">
              {JSON.stringify(ep.response, null, 2)}
            </pre>
          </div>
          {ep.errorResponses && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Error Responses</p>
              <div className="space-y-1.5">
                {ep.errorResponses.map(e => (
                  <div key={e.status} className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-red-400 text-xs w-10">{e.status}</span>
                    <span className="text-slate-400">{e.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="pt-2 border-t border-slate-800/60">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Example cURL</p>
            <div className="relative">
              <pre className="bg-[#060608] rounded-lg p-4 text-xs text-cyan-300 overflow-x-auto border border-slate-800 pr-10">
                {buildCurl(ep)}
              </pre>
              <div className="absolute top-2 right-2"><CopyButton text={buildCurl(ep)} /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ParamTable({ params }: { params: { field: string; type: string; required: boolean; description: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-xs">
        <thead className="bg-slate-900/50">
          <tr>
            <th className="text-left px-3 py-2 text-slate-400 font-semibold">Field</th>
            <th className="text-left px-3 py-2 text-slate-400 font-semibold">Type</th>
            <th className="text-left px-3 py-2 text-slate-400 font-semibold">Req</th>
            <th className="text-left px-3 py-2 text-slate-400 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {params.map(p => (
            <tr key={p.field} className="hover:bg-slate-900/30">
              <td className="px-3 py-2 font-mono text-cyan-300">{p.field}</td>
              <td className="px-3 py-2 text-purple-300">{p.type}</td>
              <td className="px-3 py-2">{p.required ? <span className="text-red-400 font-bold">*</span> : <span className="text-slate-600">â€”</span>}</td>
              <td className="px-3 py-2 text-slate-300">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function buildCurl(ep: Endpoint): string {
  const url = `${BASE_URL}${ep.path.replace(':key_code', 'SV-XXXX-XXXX-XXXX-XXXX').replace(':user_id', 'USER_UUID')}`
  const authFlag = ep.auth === 'api-key' ? `\\\n  -H "Authorization: Bearer YOUR_API_KEY" ` : ''
  if (ep.method === 'GET') return `curl -X GET "${url}" ${authFlag}\\\n  -H "Content-Type: application/json"`
  const body = ep.body ? JSON.stringify(Object.fromEntries(ep.body.filter(b => b.required).map(b => [b.field, b.type === 'string' ? 'value' : b.type === 'number' ? 1 : b.type === 'boolean' ? true : {}])), null, 2) : '{}'
  return `curl -X ${ep.method} "${url}" ${authFlag}\\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`
}

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState('auth')

  return (
    <div className="min-h-screen pt-16 bg-[#06060e] text-white flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-800 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 px-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">API Reference</p>
        <nav className="space-y-1">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} onClick={() => setActiveSection(s.id)}
              className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                activeSection === s.id ? 'bg-cyan-950/50 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}>
              <s.icon className="w-4 h-4" />{s.title}
            </a>
          ))}
        </nav>
        <div className="mt-auto pt-8 px-2 space-y-2 border-t border-slate-800">
          <p className="text-xs text-slate-500 font-semibold">Base URL</p>
          <code className="text-xs text-cyan-400 break-all">{BASE_URL}/api/v1</code>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-8 pb-24">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">StreamVibe</span>
            <span className="text-xs text-slate-600">v1.0</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">API Reference</h1>
          <p className="text-slate-400 max-w-2xl">Complete REST API for integrating StreamVibe license management into your applications. Authenticate with an API key, verify licenses, manage users, and sync Discord roles.</p>

          {/* Auth info box */}
          <div className="mt-6 p-5 bg-[#0d0d1a] rounded-xl border border-amber-900/50">
            <p className="text-sm font-bold text-amber-300 mb-2 flex items-center gap-2"><Shield className="w-4 h-4" />Authentication</p>
            <p className="text-sm text-slate-400 mb-3">Include your API key in the <code className="text-cyan-300">Authorization</code> header for all protected endpoints.</p>
            <div className="relative">
              <pre className="bg-[#060608] rounded-lg p-3 text-xs text-cyan-300 border border-slate-800 overflow-x-auto">
                {`Authorization: Bearer sv_your_api_key_here`}
              </pre>
              <div className="absolute top-1.5 right-2"><CopyButton text="Authorization: Bearer sv_your_api_key_here" /></div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Create API keys in the <a href="/admin" className="text-cyan-400 hover:underline">Admin Panel</a> or via <code className="text-purple-300">POST /api/v1/apikeys</code>.</p>
          </div>

          {/* Errors info box */}
          <div className="mt-4 p-5 bg-[#0d0d1a] rounded-xl border border-slate-800">
            <p className="text-sm font-bold text-white mb-2">Error Format</p>
            <pre className="bg-[#060608] rounded-lg p-3 text-xs text-red-300 border border-slate-800">{`{ "error": "Description of what went wrong" }`}</pre>
          </div>

          {/* Permissions table */}
          <div className="mt-4 p-5 bg-[#0d0d1a] rounded-xl border border-slate-800">
            <p className="text-sm font-bold text-white mb-3">Available Permissions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                ['keys:read', 'View license keys'], ['keys:create', 'Generate new keys'],
                ['keys:modify', 'Edit/ban/delete keys'], ['users:read', 'View user profiles'],
                ['users:modify', 'Edit/ban users'], ['discord:sync', 'Sync Discord roles'],
                ['discord:config', 'Configure Discord bot'], ['admin', 'All permissions'],
              ].map(([perm, desc]) => (
                <div key={perm} className="flex items-center gap-2">
                  <code className="text-xs text-amber-300 font-mono min-w-28">{perm}</code>
                  <span className="text-xs text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map(section => (
          <div key={section.id} id={section.id} className="mb-16 scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700">
                <section.icon className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{section.title}</h2>
            </div>
            <div className="space-y-3">
              {section.endpoints.map(ep => <EndpointCard key={ep.id} ep={ep} />)}
            </div>
          </div>
        ))}

        {/* Discord setup guide */}
        <div id="discord-setup" className="mb-16 p-6 bg-[#0d0d1a] rounded-xl border border-indigo-900/50">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Webhook className="w-5 h-5 text-indigo-400" />Discord Bot Setup Guide</h3>
          <ol className="space-y-3 text-sm text-slate-400">
            <li><span className="text-white font-semibold">1. Create a Discord Bot</span> â€” Go to <a href="https://discord.com/developers/applications" target="_blank" className="text-cyan-400 hover:underline inline-flex items-center gap-1">discord.com/developers <ExternalLink className="w-3 h-3" /></a>, create an Application, add a Bot, and enable <code className="text-purple-300">SERVER MEMBERS INTENT</code>.</li>
            <li><span className="text-white font-semibold">2. Bot Permissions</span> â€” Give the bot <code className="text-purple-300">Manage Roles</code> permission. The bot role must be higher than the tier roles it manages.</li>
            <li><span className="text-white font-semibold">3. Invite Bot</span> â€” Use the OAuth2 URL generator with <code className="text-purple-300">bot</code> scope and <code className="text-purple-300">Manage Roles</code> permission.</li>
            <li><span className="text-white font-semibold">4. Create Tier Roles</span> â€” Create roles in your Discord server for each tier: Free, Basic, Pro, Legend. Copy the role IDs (enable Developer Mode in Discord settings â†’ right-click role â†’ Copy ID).</li>
            <li><span className="text-white font-semibold">5. Configure via API</span> â€” Call <code className="text-cyan-300">PUT /api/v1/discord/config</code> with your guild ID, bot token, and tierâ†’role ID mapping.</li>
            <li><span className="text-white font-semibold">6. Sync Users</span> â€” Call <code className="text-cyan-300">POST /api/v1/discord/sync</code> with the user&apos;s Discord ID, guild ID, and StreamVibe user ID whenever a purchase is made or plan changes.</li>
          </ol>
        </div>

        <p className="text-center text-slate-600 text-sm">StreamVibe API v1.0 â€” <a href="/" className="text-cyan-400 hover:underline">Back to StreamVibe</a></p>
      </main>
    </div>
  )
}
