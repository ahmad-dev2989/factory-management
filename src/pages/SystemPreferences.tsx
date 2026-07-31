import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Bell, Mail, LogOut, ChevronRight, Save, RotateCcw, FolderOpen, DatabaseBackup, DownloadCloud, Info, ArrowLeft } from 'lucide-react';

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
    <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${checked ? 'bg-[#2F80ED]' : 'bg-[#E5E7EB]'}`}
    >
        <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transform transition-transform ${checked ? 'translate-x-4.5' : ''}`} />
    </div>
);

export default function SystemPreferences() {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/login');
    };

    const defaultPrefs = {
        // General
        businessCurrency: 'PKR',
        currencySymbol: 'Rs.',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12 Hour',
        language: 'English',
        // Invoice
        invoicePrefix: 'INV-',
        startingInvoiceNumber: '1001',
        autoIncrementInvoice: true,
        invoiceFooterNotes: 'Thank you for your business.',
        // Inventory
        lowStockWarning: true,
        defaultLowStockQty: '10',
        allowNegativeStock: false,
        // Application
        theme: 'Light',
        enableNotifications: true,
        enableConfirmations: true,
    };

    const [prefs, setPrefs] = useState(defaultPrefs);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const fetchPrefs = async () => {
            try {
                const res = await (window as any).electron.invoke('db-query', "SELECT value FROM app_settings WHERE key = 'system_preferences_config'");
                if (res && res[0] && res[0].value) {
                    setPrefs(JSON.parse(res[0].value));
                }
            } catch (err) {
                console.error('[SystemPreferences] Failed to load preferences:', err);
            }
        };
        fetchPrefs();
    }, []);

    const updatePref = (key: keyof typeof defaultPrefs, value: string | boolean) => {
        setPrefs(prev => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: '' }));
        }
    };

    const handleSave = () => {
        const newErrors: Record<string, string> = {};

        if (!prefs.invoicePrefix.trim()) {
            newErrors.invoicePrefix = 'Invoice Prefix cannot be empty';
        }

        if (isNaN(Number(prefs.startingInvoiceNumber)) || prefs.startingInvoiceNumber.trim() === '') {
            newErrors.startingInvoiceNumber = 'Must be a valid number';
        }

        if (isNaN(Number(prefs.defaultLowStockQty)) || prefs.defaultLowStockQty.trim() === '') {
            newErrors.defaultLowStockQty = 'Must be a valid number';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setSuccessMessage('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const savePrefs = async () => {
            try {
                await (window as any).electron.invoke(
                    'db-query',
                    "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('system_preferences_config', ?)",
                    [JSON.stringify(prefs)]
                );
                setErrors({});
                setSuccessMessage('System preferences updated successfully.');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => setSuccessMessage(''), 4000);
            } catch (err) {
                console.error('[SystemPreferences] Failed to save preferences:', err);
            }
        };
        savePrefs();
    };

    const handleReset = () => {
        const resetPrefs = async () => {
            try {
                await (window as any).electron.invoke(
                    'db-query',
                    "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('system_preferences_config', ?)",
                    [JSON.stringify(defaultPrefs)]
                );
                setPrefs(defaultPrefs);
                setErrors({});
                setSuccessMessage('System preferences reset to defaults.');
                setTimeout(() => setSuccessMessage(''), 4000);
            } catch (err) {
                console.error('[SystemPreferences] Failed to reset preferences:', err);
            }
        };
        resetPrefs();
    };

    return (
        <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen overflow-x-hidden">
            {/* Top Blue Header */}
            <header className="h-[60px] bg-[#2F80ED] text-white flex items-center justify-between px-5 shrink-0 shadow-sm relative z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/settings')}
                        className="flex items-center justify-center p-1.5 hover:bg-white/10 rounded transition-colors cursor-pointer focus:outline-none"
                        title="Back to Settings"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="bg-white/15 px-2.5 py-1 rounded text-xs font-bold tracking-widest border border-white/20 select-none">
                        LB
                    </div>
                    <span className="font-semibold text-lg tracking-wide">
                        Factory App
                    </span>
                </div>
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-4 text-white/80 border-r border-white/20 pr-4">
                        <button className="hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none" title="Network Connection">
                            <Wifi className="w-[18px] h-[18px]" />
                        </button>
                        <button className="hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none relative" title="Notifications">
                            <Bell className="w-[18px] h-[18px]" />
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                        </button>
                        <button className="hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none" title="Messages">
                            <Mail className="w-[18px] h-[18px]" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-white/15 rounded-full flex items-center justify-center text-xs font-semibold border border-white/10">
                                A
                            </div>
                            <span className="text-sm font-semibold">Admin</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="hover:bg-white/10 p-1.5 rounded transition-colors cursor-pointer focus:outline-none flex items-center justify-center text-white/90 hover:text-white"
                            title="Logout"
                        >
                            <LogOut className="w-[18px] h-[18px]" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Breadcrumbs & Page Titles */}
            <div className="bg-white border-b border-[#E5E7EB] py-5 px-8 flex flex-col justify-center relative z-10">
                <div className="max-w-[1400px] w-full mx-auto flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] tracking-wide uppercase">
                        <button
                            type="button"
                            onClick={() => navigate('/settings')}
                            className="hover:text-[#2F80ED] transition-colors cursor-pointer focus:outline-none"
                        >
                            Settings
                        </button>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-[#1F2937]">System Preferences</span>
                    </div>

                    <h2 className="text-xl font-bold text-[#1F2937] mt-1">
                        System Preferences
                    </h2>
                    <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
                        Configure application-wide behavior.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-grow p-8 overflow-y-auto">
                <div className="max-w-[1400px] w-full mx-auto space-y-6">

                    {successMessage && (
                        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-[8px] flex items-center gap-2 select-none">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            {successMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                        {/* LEFT COLUMN */}
                        <div className="space-y-6">

                            {/* SECTION: General */}
                            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] p-6">
                                <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-5 uppercase tracking-wide">
                                    General
                                </h3>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">Business Currency</label>
                                        <input type="text" value={prefs.businessCurrency} onChange={(e) => updatePref('businessCurrency', e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">Currency Symbol</label>
                                        <input type="text" value={prefs.currencySymbol} onChange={(e) => updatePref('currencySymbol', e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">Date Format</label>
                                        <select value={prefs.dateFormat} onChange={(e) => updatePref('dateFormat', e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 cursor-pointer">
                                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">Time Format</label>
                                        <select value={prefs.timeFormat} onChange={(e) => updatePref('timeFormat', e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 cursor-pointer">
                                            <option value="12 Hour">12 Hour</option>
                                            <option value="24 Hour">24 Hour</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">Language</label>
                                        <select value={prefs.language} onChange={(e) => updatePref('language', e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 cursor-pointer">
                                            <option value="English">English</option>
                                            <option value="Urdu" disabled>Urdu (Coming Soon)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION: Invoice Settings */}
                            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] p-6">
                                <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-5 uppercase tracking-wide">
                                    Invoice Settings
                                </h3>
                                <div className="grid grid-cols-2 gap-5 mb-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">Invoice Prefix</label>
                                        <input type="text" value={prefs.invoicePrefix} onChange={(e) => updatePref('invoicePrefix', e.target.value)} className={`w-full px-3 py-2 bg-white border ${errors.invoicePrefix ? 'border-red-500' : 'border-[#E5E7EB]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`} />
                                        {errors.invoicePrefix && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.invoicePrefix}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">Starting Invoice Number</label>
                                        <input type="text" value={prefs.startingInvoiceNumber} onChange={(e) => updatePref('startingInvoiceNumber', e.target.value)} className={`w-full px-3 py-2 bg-white border ${errors.startingInvoiceNumber ? 'border-red-500' : 'border-[#E5E7EB]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`} />
                                        {errors.startingInvoiceNumber && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.startingInvoiceNumber}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mb-5 bg-[#F6F8FB] p-3 rounded-[6px] border border-[#E5E7EB]">
                                    <span className="text-sm font-semibold text-[#1F2937]">Auto Increment Invoice Numbers</span>
                                    <Toggle checked={prefs.autoIncrementInvoice} onChange={(val) => updatePref('autoIncrementInvoice', val)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">Invoice Footer Notes</label>
                                    <textarea rows={3} value={prefs.invoiceFooterNotes} onChange={(e) => updatePref('invoiceFooterNotes', e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 resize-none" />
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">

                            {/* SECTION: Inventory */}
                            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] p-6">
                                <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-5 uppercase tracking-wide">
                                    Inventory
                                </h3>
                                <div className="flex items-center justify-between mb-4 bg-[#F6F8FB] p-3 rounded-[6px] border border-[#E5E7EB]">
                                    <span className="text-sm font-semibold text-[#1F2937]">Low Stock Warning</span>
                                    <Toggle checked={prefs.lowStockWarning} onChange={(val) => updatePref('lowStockWarning', val)} />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">Default Low Stock Quantity</label>
                                    <input type="text" value={prefs.defaultLowStockQty} onChange={(e) => updatePref('defaultLowStockQty', e.target.value)} disabled={!prefs.lowStockWarning} className={`w-full px-3 py-2 bg-white border ${errors.defaultLowStockQty ? 'border-red-500' : 'border-[#E5E7EB]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1 disabled:opacity-50`} />
                                    {errors.defaultLowStockQty && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.defaultLowStockQty}</p>}
                                </div>
                                <div className="flex items-center justify-between bg-[#F6F8FB] p-3 rounded-[6px] border border-[#E5E7EB]">
                                    <span className="text-sm font-semibold text-[#1F2937]">Allow Negative Stock</span>
                                    <Toggle checked={prefs.allowNegativeStock} onChange={(val) => updatePref('allowNegativeStock', val)} />
                                </div>
                            </div>

                            {/* SECTION: Application */}
                            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] p-6">
                                <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-5 uppercase tracking-wide">
                                    Application
                                </h3>
                                <div className="mb-5">
                                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">Theme</label>
                                    <select value={prefs.theme} onChange={(e) => updatePref('theme', e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 cursor-pointer">
                                        <option value="Light">Light</option>
                                        <option value="Dark" disabled>Dark (Coming Soon)</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between mb-4 bg-[#F6F8FB] p-3 rounded-[6px] border border-[#E5E7EB]">
                                    <span className="text-sm font-semibold text-[#1F2937]">Enable Notifications</span>
                                    <Toggle checked={prefs.enableNotifications} onChange={(val) => updatePref('enableNotifications', val)} />
                                </div>
                                <div className="flex items-center justify-between bg-[#F6F8FB] p-3 rounded-[6px] border border-[#E5E7EB]">
                                    <span className="text-sm font-semibold text-[#1F2937]">Enable Confirmation Dialogs</span>
                                    <Toggle checked={prefs.enableConfirmations} onChange={(val) => updatePref('enableConfirmations', val)} />
                                </div>
                            </div>

                            {/* SECTION: Backup & Restore */}
                            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] p-6">
                                <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-5 uppercase tracking-wide">
                                    Backup & Restore
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">Database Backup Location</label>
                                        <div className="flex items-center gap-2">
                                            <input type="text" readOnly value="C:\Backups\FactoryApp" className="flex-1 px-3 py-2 bg-[#F6F8FB] border border-[#E5E7EB] text-[#6B7280] text-sm rounded-[6px] focus:outline-none cursor-not-allowed" />
                                            <button type="button" className="p-2 border border-[#E5E7EB] rounded-[6px] hover:bg-[#F6F8FB] text-[#1F2937] transition-colors" title="Choose Folder">
                                                <FolderOpen className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button type="button" className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-[#1F2937] text-sm font-semibold rounded-[6px] transition-colors cursor-pointer">
                                            <DatabaseBackup className="w-4 h-4 text-[#27AE60]" /> Create Backup
                                        </button>
                                        <button type="button" className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-[#1F2937] text-sm font-semibold rounded-[6px] transition-colors cursor-pointer">
                                            <DownloadCloud className="w-4 h-4 text-[#2F80ED]" /> Restore Backup
                                        </button>
                                    </div>
                                    <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold rounded-[6px] flex gap-2">
                                        <Info className="w-4 h-4 shrink-0" />
                                        <span>Backup functionality will be implemented after SQLite integration.</span>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION: About */}
                            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] p-6">
                                <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-4 uppercase tracking-wide">
                                    About
                                </h3>
                                <div className="space-y-2 text-sm text-[#4B5563]">
                                    <div className="flex justify-between border-b border-[#E5E7EB] pb-1.5"><span className="font-semibold text-[#1F2937]">Application Name:</span> <span>Factory App</span></div>
                                    <div className="flex justify-between border-b border-[#E5E7EB] pb-1.5"><span className="font-semibold text-[#1F2937]">Version:</span> <span>1.0.0</span></div>
                                    <div className="flex justify-between border-b border-[#E5E7EB] pb-1.5"><span className="font-semibold text-[#1F2937]">Developer:</span> <span>Ahmad Farooq</span></div>
                                    <div className="flex justify-between"><span className="font-semibold text-[#1F2937]">Build Date:</span> <span>July 2026</span></div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 pt-6 border-t border-[#E5E7EB] flex items-center justify-end gap-3 bg-white p-6 rounded-[10px] border shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px] transition-colors cursor-pointer focus:outline-none"
                        >
                            <RotateCcw className="w-4 h-4" /> Reset to Defaults
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#2F80ED] hover:bg-[#1B6FD1] text-sm font-semibold text-white rounded-[6px] transition-colors cursor-pointer shadow-sm focus:outline-none"
                        >
                            <Save className="w-4 h-4" /> Save Preferences
                        </button>
                    </div>

                </div>
            </main>
        </div>
    );
}