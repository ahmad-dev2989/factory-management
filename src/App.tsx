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
import Products from './pages/Products';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import CashIn from './pages/CashIn';
import CashOut from './pages/CashOut';
import Reports from './pages/Reports';
import Dashboard from './pages/Dashboard';
import ChartOfAccounts from './pages/ChartOfAccounts';
import ExpenseAccounts from './pages/ExpenseAccounts';
import LinkedAccounts from './pages/LinkedAccounts';
import SystemPreferences from './pages/SystemPreferences';
import BackupRestore from './pages/BackupRestore';
import Splash from './pages/Splash';
import { UpdateProvider } from './context/UpdateContext';
import { NotificationProvider } from './context/NotificationContext';

export default function App() {
  const [adminPassword, setAdminPassword] = useState('admin');

  return (
    <Router>
      <NotificationProvider>
        <UpdateProvider>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/login" element={<Login adminPassword={adminPassword} />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/company-profile" element={<CompanyProfile />} />
            <Route
              path="/change-password"
              element={<ChangePassword adminPassword={adminPassword} setAdminPassword={setAdminPassword} />}
            />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/bank-accounts" element={<BankAccounts />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/cash-in" element={<CashIn />} />
            <Route path="/cash-out" element={<CashOut />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/products" element={<Products />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
            <Route path="/expense-accounts" element={<ExpenseAccounts />} />
            <Route path="/linked-accounts" element={<LinkedAccounts />} />
            <Route path="/system-preferences" element={<SystemPreferences />} />
            <Route path="/backup-restore" element={<BackupRestore />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </UpdateProvider>
      </NotificationProvider>
    </Router>
  );
}
