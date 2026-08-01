import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Bell, Mail, LogOut, ChevronRight, ArrowLeft } from 'lucide-react';
import { SidebarToggle } from '../components/Sidebar';

export default function CompanyProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    navigate('/login');
  };

  const [logo, setLogo] = useState<string | null>(null); // Base64 Data URL for preview/SQLite storage
  const [logoError, setLogoError] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    businessName: '',
    ownerName: '',
    phone: '',
    altPhone: '',
    email: '',
    website: '',
    address1: '',
    address2: '',
    city: '',
    province: '',
    country: '',
    postalCode: '',
    ntn: '',
    strn: '',
    regNumber: '',
    businessType: 'Manufacturer',
    invoicePrefix: 'INV-',
    quotationPrefix: 'QTN-',
    currency: 'PKR',
    decimalPlaces: '2',
    invoiceFooter: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const [logoPath, setLogoPath] = useState<string | null>(null); // Relative path in SQLite

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await (window as any).electron.invoke('db-query', 'SELECT * FROM company WHERE id = 1');
        if (res && res[0]) {
          const c = res[0];
          setFormData({
            companyName: c.company_name,
            businessName: c.business_name || '',
            ownerName: c.owner_name || '',
            phone: c.phone || '',
            altPhone: c.alt_phone || '',
            email: c.email || '',
            website: c.website || '',
            address1: c.address1 || '',
            address2: c.address2 || '',
            city: c.city || '',
            province: c.province || '',
            country: c.country || '',
            postalCode: c.postal_code || '',
            ntn: c.ntn || '',
            strn: c.strn || '',
            regNumber: c.reg_number || '',
            businessType: c.business_type || 'Manufacturer',
            invoicePrefix: c.invoice_prefix || 'INV-',
            quotationPrefix: c.quotation_prefix || 'QTN-',
            currency: c.currency || 'PKR',
            decimalPlaces: c.decimal_places || '2',
            invoiceFooter: c.invoice_footer || ''
          });
          setLogoPath(c.logo_path || null);
          if (c.logo_path) {
            const dataUrl = await (window as any).electron.invoke('file-read', c.logo_path);
            if (dataUrl && !dataUrl.error) {
              setLogo(dataUrl);
            }
          }
        }
      } catch (err) {
        console.error('[CompanyProfile] Failed to load company profile:', err);
      }
    };
    fetchCompany();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format (PNG, JPG, JPEG, SVG, WEBP)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setLogoError('Please select a valid image file.');
      return;
    }

    setLogoError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogo(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setLogoError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company Name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone Number is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSuccessMessage('');
      return;
    }

    const saveCompany = async () => {
      try {
        let finalLogoPath = logoPath;

        if (logo === null) {
          // Logo was deleted by user
          if (logoPath) {
            await (window as any).electron.invoke('file-delete', logoPath);
          }
          finalLogoPath = null;
        } else if (logo.startsWith('data:')) {
          // New file uploaded
          const fileRes = await (window as any).electron.invoke(
            'file-save',
            'Company/Logo',
            'logo.png',
            logo
          );
          if (fileRes && !fileRes.error) {
            finalLogoPath = fileRes.relativePath;
            // Delete old file to prevent bloat
            if (logoPath) {
              await (window as any).electron.invoke('file-delete', logoPath);
            }
          } else {
            console.error('[CompanyProfile] Failed to save logo to disk:', fileRes?.message);
          }
        }

        await (window as any).electron.invoke(
          'db-query',
          `INSERT OR REPLACE INTO company (
            id, company_name, business_name, owner_name, phone, alt_phone, email, website,
            address1, address2, city, province, country, postal_code, ntn, strn,
            reg_number, business_type, invoice_prefix, quotation_prefix, currency,
            decimal_places, invoice_footer, logo_path
          ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            formData.companyName.trim(), formData.businessName.trim(), formData.ownerName.trim(),
            formData.phone.trim(), formData.altPhone.trim(), formData.email.trim(), formData.website.trim(),
            formData.address1.trim(), formData.address2.trim(), formData.city.trim(), formData.province.trim(),
            formData.country.trim(), formData.postalCode.trim(), formData.ntn.trim(), formData.strn.trim(),
            formData.regNumber.trim(), formData.businessType, formData.invoicePrefix.trim(),
            formData.quotationPrefix.trim(), formData.currency, formData.decimalPlaces,
            formData.invoiceFooter.trim(), finalLogoPath
          ]
        );

        setLogoPath(finalLogoPath);
        setErrors({});
        setSuccessMessage('Company information saved successfully.');
        setTimeout(() => setSuccessMessage(''), 4000);
      } catch (err) {
        console.error('[CompanyProfile] Failed to save company profile:', err);
      }
    };
    saveCompany();
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
      {/* Top Blue Header */}
      <header className="h-[60px] bg-[#2F80ED] text-white flex items-center justify-between px-5 shrink-0 shadow-sm">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/settings')} 
            className="flex items-center justify-center p-1.5 hover:bg-white/10 rounded transition-colors cursor-pointer focus:outline-none"
            title="Back to Settings"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <SidebarToggle />
          
          <span className="font-semibold text-lg tracking-wide">
            Factory App
          </span>
        </div>

        {/* Right Side */}
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

      {/* Breadcrumb & Page Title Area */}
      <div className="bg-white border-b border-[#E5E7EB] py-5 px-8 flex flex-col justify-center">
        <div className="max-w-[1400px] w-full mx-auto flex flex-col gap-1.5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] tracking-wide uppercase">
            <button 
              type="button"
              onClick={() => navigate('/settings')} 
              className="hover:text-[#2F80ED] transition-colors cursor-pointer focus:outline-none"
            >
              Settings
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1F2937]">Company Profile</span>
          </div>
          
          <h2 className="text-xl font-bold text-[#1F2937] mt-1">
            Company Profile
          </h2>
          <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
            Manage your business information
          </p>
        </div>
      </div>

      {/* Main Form Content */}
      <main className="flex-grow p-8 overflow-y-auto">
        <div className="max-w-[1400px] w-full mx-auto">
          <form onSubmit={handleSave} className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] p-8">
            
            {/* Section 1: Basic Information */}
            <div className="space-y-6">
              <h3 className="text-base font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2">
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {/* Logo section */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
                    Company Logo
                  </label>
                  <div className="flex items-center gap-4">
                    {/* Native File Input (Hidden) */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoChange}
                      accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                      className="hidden"
                    />

                    {/* Logo Box Container */}
                    {logo ? (
                      <div className="w-24 h-24 bg-[#F6F8FB] border border-[#E5E7EB] rounded-[8px] flex items-center justify-center overflow-hidden p-1">
                        <img 
                          src={logo} 
                          alt="Company Logo Preview" 
                          className="w-full h-full object-contain rounded-[6px]"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-[#F6F8FB] border-2 border-dashed border-[#E5E7EB] rounded-[8px] flex flex-col items-center justify-center text-center p-2 select-none">
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Logo Placeholder</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-xs font-semibold text-[#1F2937] rounded-[6px] transition-colors cursor-pointer focus:outline-none"
                      >
                        Upload Logo
                      </button>
                      <button 
                        type="button" 
                        onClick={handleRemoveLogo}
                        className="px-3 py-1.5 bg-white border border-red-100 hover:bg-red-50 text-xs font-semibold text-red-600 rounded-[6px] transition-colors cursor-pointer focus:outline-none"
                      >
                        Remove Logo
                      </button>
                    </div>
                  </div>
                  {logoError && (
                    <p className="text-red-500 text-xs mt-2 font-semibold">{logoError}</p>
                  )}
                </div>

                {/* Name fields */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g. Acme Industries"
                      className={`w-full px-3.5 py-2 bg-white border ${errors.companyName ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1 transition-colors`}
                    />
                    {errors.companyName && (
                      <p className="text-red-500 text-xs mt-1 font-semibold">{errors.companyName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      placeholder="e.g. Acme Manufacturing"
                      className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                      Owner Name
                    </label>
                    <input
                      type="text"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Contact Information */}
            <div className="space-y-6 mt-8">
              <h3 className="text-base font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2">
                Contact Information
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +92 300 1234567"
                    className={`w-full px-3.5 py-2 bg-white border ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1 transition-colors`}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1 font-semibold">{errors.phone}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Alternate Phone
                  </label>
                  <input
                    type="text"
                    value={formData.altPhone}
                    onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                    placeholder="e.g. +92 42 35123456"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. info@acme.com"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Website
                  </label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="e.g. www.acme.com"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={formData.address1}
                    onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                    placeholder="e.g. 123 Industrial Area"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.address2}
                    onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                    placeholder="e.g. Sector-G, Phase-II"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Lahore"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Province
                  </label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    placeholder="e.g. Punjab"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g. Pakistan"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="e.g. 54000"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Business Information */}
            <div className="space-y-6 mt-8">
              <h3 className="text-base font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2">
                Business Information
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    NTN
                  </label>
                  <input
                    type="text"
                    value={formData.ntn}
                    onChange={(e) => setFormData({ ...formData, ntn: e.target.value })}
                    placeholder="e.g. 1234567-8"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    STRN
                  </label>
                  <input
                    type="text"
                    value={formData.strn}
                    onChange={(e) => setFormData({ ...formData, strn: e.target.value })}
                    placeholder="e.g. 12-34-5678-901-23"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Business Reg Number
                  </label>
                  <input
                    type="text"
                    value={formData.regNumber}
                    onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                    placeholder="e.g. REG-987654"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Business Type
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors cursor-pointer"
                  >
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Retailer">Retailer</option>
                    <option value="Wholesaler">Wholesaler</option>
                    <option value="Service Provider">Service Provider</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Invoice Settings */}
            <div className="space-y-6 mt-8">
              <h3 className="text-base font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2">
                Invoice Settings
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                    placeholder="e.g. INV-"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Quotation Prefix
                  </label>
                  <input
                    type="text"
                    value={formData.quotationPrefix}
                    onChange={(e) => setFormData({ ...formData, quotationPrefix: e.target.value })}
                    placeholder="e.g. QTN-"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors cursor-pointer"
                  >
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                    <option value="SAR">SAR</option>
                    <option value="AED">AED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Decimal Places
                  </label>
                  <select
                    value={formData.decimalPlaces}
                    onChange={(e) => setFormData({ ...formData, decimalPlaces: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors cursor-pointer"
                  >
                    <option value="0">0</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>

                <div className="col-span-4">
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                    Invoice Footer
                  </label>
                  <textarea
                    rows={4}
                    value={formData.invoiceFooter}
                    onChange={(e) => setFormData({ ...formData, invoiceFooter: e.target.value })}
                    placeholder="Enter invoice terms, bank details, or footer text"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Save & Cancel Buttons */}
            <div className="flex items-center justify-between border-t border-[#E5E7EB] mt-8 pt-6">
              {/* Success Notification message */}
              <div className="flex-1">
                {successMessage && (
                  <div className="text-green-600 font-semibold text-sm flex items-center gap-2 select-none">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                    {successMessage}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="px-5 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px] transition-colors cursor-pointer focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-sm font-semibold text-white rounded-[6px] transition-colors cursor-pointer focus:outline-none shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
