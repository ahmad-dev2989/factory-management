import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function WifiStatus() {
  const [ssid, setSsid] = useState<string | null>(null);

  useEffect(() => {
    const fetchSsid = async () => {
      try {
        const name = await (window as any).electron.invoke('get-wifi-ssid');
        setSsid(name);
      } catch {
        setSsid(null);
      }
    };

    fetchSsid();
    const interval = setInterval(fetchSsid, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex items-center gap-1.5 hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none"
      title={ssid ? `Connected to: ${ssid}` : 'No WiFi connection'}
    >
      {ssid ? (
        <Wifi className="w-[18px] h-[18px]" />
      ) : (
        <WifiOff className="w-[18px] h-[18px]" />
      )}
      <span className="text-xs font-medium max-w-[120px] truncate">
        {ssid || 'Not Connected'}
      </span>
    </div>
  );
}
