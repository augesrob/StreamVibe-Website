import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Code, Book, Copy, Server, Shield, Key, Bot } from 'lucide-react';
import { PROJECT_ID, BASE_FUNCTIONS_URL } from '@/lib/api-endpoints';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ApiDocumentation = () => {
    const [activeLang, setActiveLang] = useState('curl');
    const { toast } = useToast();

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: "Code snippet copied to clipboard." });
    };

    const sections = [
        {
            id: 'verification',
            icon: <Shield className="w-4 h-4 mr-2" />,
            title: 'Verification API',
            description: 'Verify license keys and check status.',
            endpoints: [
                {
                    name: 'Verify License',
                    method: 'POST',
                    url: `${BASE_FUNCTIONS_URL}/license-api`,
                    desc: 'Verify a single license key.',
                    body: { action: 'verify', key_code: 'KEY-XXXX-XXXX-XXXX' },
                    response: { success: true, valid: true, plan: "Pro", expires_at: "2025-01-01" }
                },
                {
                    name: 'Check Status',
                    method: 'POST',
                    url: `${BASE_FUNCTIONS_URL}/license-api`,
                    desc: 'Check license status for a user.',
                    body: { action: 'check_status', user_id: 'uuid-here' },
                    response: { success: true, has_active: true, plan: "Pro" }
                }
            ]
        },
        {
            id: 'management',
            icon: <Server className="w-4 h-4 mr-2" />,
            title: 'Management API',
            description: 'Admin endpoints for managing keys.',
            endpoints: [
                {
                    name: 'Generate Keys',
                    method: 'POST',
                    url: `${BASE_FUNCTIONS_URL}/license-management-api`,
                    desc: 'Generate new license keys.',
                    auth: true,
                    body: { action: 'generate', plan_id: 'uuid', count: 5 },
                    response: { success: true, keys: ["KEY-1...", "KEY-2..."] }
                },
                {
                    name: 'Revoke Key',
                    method: 'POST',
                    url: `${BASE_FUNCTIONS_URL}/license-management-api`,
                    desc: 'Revoke a specific license key.',
                    auth: true,
                    body: { action: 'revoke', key_code: 'KEY-XXXX...' },
                    response: { success: true, message: "Key revoked" }
                }
            ]
        },
        {
            id: 'discord',
            icon: <Bot className="w-4 h-4 mr-2" />,
            title: 'Discord Bot API',
            description: 'Endpoints specifically for Discord bots.',
            endpoints: [
                {
                    name: 'Verify User',
                    method: 'POST',
                    url: `${BASE_FUNCTIONS_URL}/discord-api`,
                    desc: 'Verify a license for a Discord user ID.',
                    body: { action: 'verify', key_code: 'KEY-XXXX...', discord_id: '123456789' },
                    response: { success: true, role_id: "987654321", message: "Verified!" }
                }
            ]
        },
        {
            id: 'apikeys',
            icon: <Key className="w-4 h-4 mr-2" />,
            title: 'API Keys',
            description: 'Manage programmatic access keys.',
            endpoints: [
                {
                    name: 'Create API Key',
                    method: 'POST',
                    url: `${BASE_FUNCTIONS_URL}/api-key-management-api`,
                    desc: 'Create a new scoped API key.',
                    auth: true,
                    body: { action: 'create', name: 'Billing Bot', scopes: ['read:licenses'] },
                    response: { success: true, api_key: "sk_abc123..." }
                }
            ]
        }
    ];

    const generateSnippet = (lang, ep) => {
        if (lang === 'curl') {
            return `curl -X POST "${ep.url}" \\
  -H "Content-Type: application/json" \\
  ${ep.auth ? '-H "Authorization: Bearer YOUR_ADMIN_KEY" \\' : ''}
  -d '${JSON.stringify(ep.body)}'`;
        }
        if (lang === 'js') {
            return `const response = await fetch('${ep.url}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ${ep.auth ? "'Authorization': 'Bearer YOUR_ADMIN_KEY'" : ''}
  },
  body: JSON.stringify(${JSON.stringify(ep.body, null, 2)})
});
const data = await response.json();
console.log(data);`;
        }
        if (lang === 'python') {
            return `import requests

url = "${ep.url}"
payload = ${JSON.stringify(ep.body)}
headers = {
  "Content-Type": "application/json",
  ${ep.auth ? '"Authorization": "Bearer YOUR_ADMIN_KEY"' : ''}
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;
        }
        if (lang === 'csharp') {
             return `using System.Net.Http;
using System.Text;
using System.Text.Json;

var client = new HttpClient();
var url = "${ep.url}";
var payload = new StringContent(
    "${JSON.stringify(ep.body).replace(/"/g, '\\"')}", 
    Encoding.UTF8, 
    "application/json"
);

${ep.auth ? 'client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "YOUR_ADMIN_KEY");' : ''}

var response = await client.PostAsync(url, payload);
var content = await response.Content.ReadAsStringAsync();
Console.WriteLine(content);`;
        }
        return '';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-10">
            <div className="space-y-4">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">API Documentation</h1>
                <p className="text-gray-400 max-w-2xl">
                    Comprehensive reference for the StreamVibe License API. 
                    All endpoints are located at <code className="text-cyan-400">{BASE_FUNCTIONS_URL}</code>.
                </p>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-green-800 text-green-400">v1.0.0 Stable</Badge>
                    <Badge variant="outline" className="border-blue-800 text-blue-400">HTTPS Only</Badge>
                    <Badge variant="outline" className="border-purple-800 text-purple-400">JSON Responses</Badge>
                </div>
            </div>

            <Card className="bg-[#1a1a24] border-gray-800">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Endpoints</CardTitle>
                        <Tabs value={activeLang} onValueChange={setActiveLang} className="w-[400px]">
                            <TabsList className="grid w-full grid-cols-4 bg-[#12121a]">
                                <TabsTrigger value="curl">cURL</TabsTrigger>
                                <TabsTrigger value="js">Node.js</TabsTrigger>
                                <TabsTrigger value="python">Python</TabsTrigger>
                                <TabsTrigger value="csharp">C#</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="verification" className="flex flex-col md:flex-row gap-6">
                        <TabsList className="flex md:flex-col h-auto bg-transparent gap-2 justify-start w-full md:w-56">
                            {sections.map(s => (
                                <TabsTrigger key={s.id} value={s.id} className="w-full justify-start py-3 px-4 data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-400 border border-transparent data-[state=active]:border-cyan-900/50">
                                    {s.icon} {s.title}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <div className="flex-1 min-w-0">
                            {sections.map(section => (
                                <TabsContent key={section.id} value={section.id} className="mt-0 space-y-6">
                                    <div className="mb-6">
                                        <h3 className="text-2xl font-bold text-white">{section.title}</h3>
                                        <p className="text-gray-400">{section.description}</p>
                                    </div>

                                    {section.endpoints.map((ep, i) => (
                                        <div key={i} className="border border-gray-800 rounded-lg overflow-hidden bg-[#12121a] mb-6">
                                            <div className="p-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <Badge className="bg-green-600 font-mono">POST</Badge>
                                                    <span className="font-semibold text-white">{ep.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 font-mono bg-black/30 px-2 py-1 rounded">
                                                    {ep.url}
                                                </div>
                                            </div>
                                            
                                            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <p className="text-sm text-gray-300">{ep.desc}</p>
                                                    {ep.auth && (
                                                        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/20 p-2 rounded border border-amber-900/30">
                                                            <Shield className="w-3 h-3" /> Requires Authentication (Bearer Token or API Key)
                                                        </div>
                                                    )}
                                                    
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Example Body</span>
                                                        <pre className="mt-2 p-3 rounded bg-black/50 text-xs text-blue-300 overflow-x-auto border border-gray-800">
                                                            {JSON.stringify(ep.body, null, 2)}
                                                        </pre>
                                                    </div>

                                                    <div>
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Example Response</span>
                                                        <pre className="mt-2 p-3 rounded bg-black/50 text-xs text-green-300 overflow-x-auto border border-gray-800">
                                                            {JSON.stringify(ep.response, null, 2)}
                                                        </pre>
                                                    </div>
                                                </div>

                                                <div className="relative group">
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white bg-black/50" onClick={() => copyToClipboard(generateSnippet(activeLang, ep))}>
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                    <SyntaxHighlighter 
                                                        language={activeLang === 'curl' ? 'bash' : activeLang === 'csharp' ? 'csharp' : activeLang === 'python' ? 'python' : 'javascript'} 
                                                        style={vscDarkPlus} 
                                                        customStyle={{ margin: 0, padding: '1rem', height: '100%', borderRadius: '0.5rem', fontSize: '0.8rem', lineHeight: '1.4' }}
                                                    >
                                                        {generateSnippet(activeLang, ep)}
                                                    </SyntaxHighlighter>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </TabsContent>
                            ))}
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default ApiDocumentation;