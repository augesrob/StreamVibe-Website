import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Book } from 'lucide-react';
import { PROJECT_ID, BASE_FUNCTIONS_URL } from '@/lib/api-endpoints';

const ApiLicenseDocumentation = () => {
    const endpoints = [
        {
            method: 'POST',
            path: '/verify-license-key',
            desc: 'Verify a license key (Public/Discord Bot).',
            body: '{"key_code": "KEY-XXXX-..."}',
            response: '{"valid": true, "plan_name": "Pro", ...}'
        },
        {
            method: 'POST',
            path: '/redeem-license-key',
            desc: 'Redeem a license key for the authenticated user.',
            auth: 'Bearer Token',
            body: '{"key_code": "KEY-XXXX-..."}',
            response: '{"success": true, "message": "Redeemed"}'
        }
    ];

    const discordExample = `
// Discord Bot Example (Node.js)
const fetch = require('node-fetch');

// Correct Endpoint for your project
const VERIFY_URL = '${BASE_FUNCTIONS_URL}/verify-license-key';

client.on('messageCreate', async msg => {
  if (msg.content.startsWith('!verify')) {
    const key = msg.content.split(' ')[1];
    
    try {
        const res = await fetch(VERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key_code: key })
        });
        
        const data = await res.json();
        
        if (data.valid) {
          msg.reply(\`✅ Verified! Plan: \${data.plan_name}\`);
          // Add role logic here
        } else {
          msg.reply('❌ Invalid Key');
        }
    } catch (e) {
        msg.reply('Error verifying key');
    }
  }
});
`;

    return (
        <div className="space-y-6">
            <Card className="bg-[#1a1a24] border-gray-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Book className="w-5 h-5"/> License API Reference</CardTitle>
                    <CardDescription>
                        Endpoints for managing and verifying licenses externally. 
                        Use Project ID: <code className="text-cyan-400">{PROJECT_ID}</code>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {endpoints.map((ep, i) => (
                        <div key={i} className="border border-gray-800 rounded bg-[#12121a] p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <Badge className="bg-green-600">{ep.method}</Badge>
                                <code className="text-gray-300 break-all">{BASE_FUNCTIONS_URL}{ep.path}</code>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">{ep.desc}</p>
                            {ep.auth && <Badge variant="outline" className="mb-2 mr-2">Auth: {ep.auth}</Badge>}
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <span className="text-xs text-gray-500 uppercase font-bold">Body</span>
                                    <pre className="text-xs bg-black/30 p-2 rounded text-gray-300 overflow-x-auto">{ep.body}</pre>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase font-bold">Response</span>
                                    <pre className="text-xs bg-black/30 p-2 rounded text-green-300 overflow-x-auto">{ep.response}</pre>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="bg-[#1a1a24] border-gray-800">
                <CardHeader><CardTitle>Discord Bot Integration</CardTitle></CardHeader>
                <CardContent>
                    <SyntaxHighlighter language="javascript" style={vscDarkPlus} customStyle={{background: '#12121a'}}>
                        {discordExample}
                    </SyntaxHighlighter>
                </CardContent>
            </Card>
        </div>
    );
};

export default ApiLicenseDocumentation;