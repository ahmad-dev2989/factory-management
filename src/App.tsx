import { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Settings from './pages/Settings';
import CompanyProfile from './pages/CompanyProfile';
import ChangePassword from './pages/ChangePassword';
import UserManagement from './pages/UserManagement';
import BankAccounts from './pages/BankAccounts';
import Customers from './pages/Customers';
import Employees from './pages/Employees';

export default function App() {
  const [adminPassword, setAdminPassword] = useState('admin');

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login adminPassword={adminPassword} />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/company-profile" element={<CompanyProfile />} />
        <Route
          path="/change-password"
          element={<ChangePassword adminPassword={adminPassword} setAdminPassword={setAdminPassword} />}
        />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/bank-accounts" element={<BankAccounts />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
