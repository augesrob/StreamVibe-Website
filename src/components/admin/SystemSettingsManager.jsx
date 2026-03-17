import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save } from 'lucide-react';

const SystemSettingsManager = () => {
    const { toast } = useToast();
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Initial definition of known settings to handle types correctly
    const KNOWN_SETTINGS = {
        'site_name': { label: 'Site Name', type: 'text', default: 'StreamVibe' },
        'site_description': { label: 'Site Description', type: 'text', default: 'TikTok Live Studio' },
        'support_email': { label: 'Support Email', type: 'text', default: 'support@example.com' },
        'maintenance_mode': { label: 'Maintenance Mode', type: 'boolean', default: false },
        'max_upload_size_mb': { label: 'Max Upload Size (MB)', type: 'number', default: 50 },
        'enable_registrations': { label: 'Enable User Registration', type: 'boolean', default: true },
        'tiktok_client_key': { label: 'TikTok Client Key', type: 'text', secret: true, default: '' },
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('system_settings').select('*');
        
        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            // Transform array to object for easier handling
            const settingsMap = {};
            data?.forEach(item => {
                // Parse boolean/number if possible based on known types, or raw string
                const def = KNOWN_SETTINGS[item.key];
                let val = item.value;
                if (def?.type === 'boolean') val = item.value === 'true';
                if (def?.type === 'number') val = parseFloat(item.value);
                settingsMap[item.key] = val;
            });
            setSettings(settingsMap);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = Object.keys(settings).map(key => {
                let value = settings[key];
                // Convert back to string for storage
                if (typeof value === 'boolean') value = value ? 'true' : 'false';
                if (typeof value === 'number') value = value.toString();
                
                return {
                    key,
                    value,
                    updated_at: new Date()
                };
            });

            const { error } = await supabase.from('system_settings').upsert(updates);
            
            if (error) throw error;
            
            toast({ title: "Success", description: "Settings saved successfully." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Card className="bg-[#1a1a24] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>System Configuration</CardTitle>
                    <CardDescription>Global settings for the application.</CardDescription>
                </div>
                <Button onClick={handleSave} disabled={saving || loading} className="bg-cyan-600 hover:bg-cyan-700">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                    Save Changes
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.keys(KNOWN_SETTINGS).map(key => {
                            const def = KNOWN_SETTINGS[key];
                            const currentValue = settings[key] !== undefined ? settings[key] : def.default;

                            return (
                                <div key={key} className="space-y-2 p-4 rounded border border-gray-800 bg-[#12121a]">
                                    <Label className="text-base">{def.label}</Label>
                                    
                                    {def.type === 'boolean' ? (
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-sm text-gray-500">{currentValue ? 'Enabled' : 'Disabled'}</span>
                                            <Switch 
                                                checked={currentValue} 
                                                onCheckedChange={(checked) => handleChange(key, checked)} 
                                            />
                                        </div>
                                    ) : def.type === 'number' ? (
                                        <Input 
                                            type="number" 
                                            value={currentValue} 
                                            onChange={e => handleChange(key, parseFloat(e.target.value))}
                                            className="bg-[#1a1a24] border-gray-700"
                                        />
                                    ) : (
                                        <Input 
                                            type={def.secret ? "password" : "text"} 
                                            value={currentValue} 
                                            onChange={e => handleChange(key, e.target.value)}
                                            className="bg-[#1a1a24] border-gray-700"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default SystemSettingsManager;