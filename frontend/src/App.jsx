import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, Clock, AlertTriangle, Building2, Wrench, Bell,
  RefreshCw, X, Plus, Trash2, LogOut, User
} from 'lucide-react';

const API_BASE = '/api';

export default function App() {
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem('motiSession') || '');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(sessionStorage.getItem('motiSession')));
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const role = user?.role;
  const [visits, setVisits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [atms, setAtms] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminSection, setAdminSection] = useState('schedules');
  const [showScheduleImport, setShowScheduleImport] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [notificationReadKey, setNotificationReadKey] = useState('');

  // Forms
  const [vendorTech, setVendorTech] = useState('');
  const [vendorNotes, setVendorNotes] = useState('');
  const [activeModalVisit, setActiveModalVisit] = useState(null);
  
  // Branch Action Form
  const [rating, setRating] = useState(5);
  const [branchRemarks, setBranchRemarks] = useState('');
  // Admin New Schedule Form
  const [newTerminal, setNewTerminal] = useState('');
  const [newDate, setNewDate] = useState('');
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleError, setScheduleError] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Unified Branch & Terminal Form State
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [atmModel, setAtmModel] = useState('NCR SelfServ 84');
  const [registeringTerminal, setRegisteringTerminal] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [scheduleWorkbook, setScheduleWorkbook] = useState(null);
  const [importingSchedule, setImportingSchedule] = useState(false);
  const [scheduleImportMessage, setScheduleImportMessage] = useState('');
  const [scheduleImportError, setScheduleImportError] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('VENDOR');
  const [newUserBranchId, setNewUserBranchId] = useState('');
  const [newUserTerminalIds, setNewUserTerminalIds] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [userError, setUserError] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    if (!authToken) {
      setAuthLoading(false);
      return;
    }
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error('Session expired');
        const data = await res.json();
        setUser(data.user);
      })
      .catch(() => {
        sessionStorage.removeItem('motiSession');
        setAuthToken('');
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchBranches();
    fetchAtms();
    fetchAnalytics();
    fetchVisits();
    if (user.role === 'ADMIN') fetchUsers();
  }, [user]);

  const currentNotificationReadKey = user ? `motiReadNotifications:${user.id}:${user.role}` : '';

  useEffect(() => {
    if (!currentNotificationReadKey) return;
    const stored = localStorage.getItem(currentNotificationReadKey);
    setReadNotificationIds(stored ? stored.split('\n').filter(Boolean) : []);
    setNotificationReadKey(currentNotificationReadKey);
  }, [currentNotificationReadKey]);

  useEffect(() => {
    if (!user) return undefined;
    const refreshDashboard = () => {
      fetchVisits({ silent: true });
      fetchAnalytics();
    };
    const interval = window.setInterval(refreshDashboard, 60000);
    return () => window.clearInterval(interval);
  }, [user]);

  const apiFetch = async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${authToken}`);
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      sessionStorage.removeItem('motiSession');
      setAuthToken('');
      setUser(null);
    }
    return res;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(data.error || 'Unable to sign in. Check your username and password.');
        return;
      }
      sessionStorage.setItem('motiSession', data.token);
      setAuthToken(data.token);
      setUser(data.user);
      setLoginPassword('');
    } catch (_err) {
      setLoginError('Could not connect to the sign-in service. Check that the application is running.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('motiSession');
    setAuthToken('');
    setUser(null);
    setVisits([]);
    setBranches([]);
    setAtms([]);
    setUsers([]);
    setAnalytics(null);
    setActiveModalVisit(null);
  };

  const fetchBranches = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/atms/branches`);
      if (!res.ok) throw new Error('Failed to fetch branches');
      setBranches(await res.json());
    } catch (e) { console.error('Failed fetching branches', e); }
  };

  const fetchAtms = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/atms`);
      if (!res.ok) throw new Error('Failed to fetch ATMs');
      const data = await res.json();
      setAtms(data);
      if (data.length > 0) setNewTerminal((current) => current || data[0].terminal_id);
    } catch (e) { console.error('Failed fetching ATMs', e); }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/pm/analytics`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      setAnalytics(await res.json());
    } catch (e) { console.error('Failed fetching analytics', e); }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/admin/users`);
      if (!res.ok) throw new Error('Failed to fetch users');
      setUsers(await res.json());
    } catch (e) { console.error('Failed fetching users', e); }
  };

  const fetchVisits = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/pm`);
      if (!res.ok) throw new Error('Failed to fetch visits');
      setVisits(await res.json());
    } catch (e) { 
      console.error('Failed fetching visits', e); 
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleVendorComplete = async (e) => {
    e.preventDefault();
    if (!activeModalVisit) return;
    try {
      const res = await apiFetch(`${API_BASE}/pm/${activeModalVisit.id}/vendor-complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_technician: vendorTech, vendor_notes: vendorNotes })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActiveModalVisit(null);
        setVendorTech('');
        setVendorNotes('');
        fetchVisits();
        fetchAnalytics();
        if (data.email_warning) alert(data.email_warning);
      } else {
        alert(data.error || 'Failed to submit maintenance completion');
      }
    } catch (e) { alert('Could not connect to the backend'); }
  };

  const handleBranchAction = async (status) => {
    if (!activeModalVisit) return;
    if (status === 'BRANCH_DISPUTED' && !window.confirm(
      `Reject the maintenance for ${activeModalVisit.terminal_id} because the issue is not resolved?`
    )) return;
    try {
      const res = await apiFetch(`${API_BASE}/pm/${activeModalVisit.id}/branch-confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          cleanliness_rating: status === 'BRANCH_CONFIRMED' ? rating : null,
          branch_remarks: branchRemarks
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActiveModalVisit(null);
        setBranchRemarks('');
        setRating(5);
        fetchVisits();
        fetchAnalytics();
        if (data.email_warning) alert(data.email_warning);
      } else {
        alert(data.error || 'Failed to record branch response');
      }
    } catch (e) { alert('Could not connect to the backend'); }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`${API_BASE}/pm/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminal_id: newTerminal, scheduled_date: newDate })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(data.email_warning || 'PM Visit Scheduled Successfully!');
        setNewDate('');
        fetchVisits();
        fetchAnalytics();
      } else {
        alert(data.error || 'Failed to schedule visit');
      }
    } catch (e) { alert('Failed to schedule visit'); }
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    if (!editingSchedule) return;
    setSavingSchedule(true);
    setScheduleError('');
    try {
      const res = await apiFetch(`${API_BASE}/pm/${editingSchedule.id}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminal_id: editingSchedule.terminal_id,
          scheduled_date: editingSchedule.scheduled_date
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setScheduleError(data.error || 'Could not update this schedule.');
        return;
      }
      setEditingSchedule(null);
      if (data.email_warning) alert(data.email_warning);
      await Promise.all([fetchVisits(), fetchAnalytics()]);
    } catch (_err) {
      setScheduleError('Could not connect to the schedule service.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (visit) => {
    if (!confirm(`Delete the scheduled PM for ${visit.terminal_id} on ${new Date(visit.scheduled_date).toLocaleDateString()}?`)) return;
    try {
      const res = await apiFetch(`${API_BASE}/pm/${visit.id}/schedule`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Could not delete this schedule.');
        return;
      }
      await Promise.all([fetchVisits(), fetchAnalytics()]);
    } catch (_err) {
      alert('Could not connect to the schedule service.');
    }
  };

  const handleScheduleImport = async (e) => {
    e.preventDefault();
    if (!scheduleWorkbook) {
      setScheduleImportError('Choose an Excel .xlsx file first.');
      return;
    }
    setImportingSchedule(true);
    setScheduleImportError('');
    setScheduleImportMessage('');
    try {
      const formData = new FormData();
      formData.append('file', scheduleWorkbook);
      const res = await apiFetch(`${API_BASE}/admin/schedules/import`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setScheduleImportError(data.error || 'Could not import this schedule workbook.');
        return;
      }
      setScheduleImportMessage(
        `${data.imported} schedule row(s) imported; ${data.skipped} existing row(s) skipped.${data.email_warning ? ` ${data.email_warning}` : ''}`
      );
      setScheduleWorkbook(null);
      e.target.reset();
      await Promise.all([fetchVisits(), fetchAnalytics()]);
    } catch (_err) {
      setScheduleImportError('Could not connect to the schedule import service.');
    } finally {
      setImportingSchedule(false);
    }
  };

  const handleDownloadScheduleTemplate = async () => {
    setScheduleImportError('');
    try {
      const res = await apiFetch(`${API_BASE}/admin/schedules/template`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setScheduleImportError(data.error || 'Could not download the schedule template.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pm-schedule-template.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (_err) {
      setScheduleImportError('Could not connect to the schedule template service.');
    }
  };

  // Unified Branch & Terminal Registration Handler
  const handleRegisterBranchAndAtm = async (e) => {
    e.preventDefault();
    setRegisteringTerminal(true);
    setRegistrationMessage('');
    setRegistrationError('');
    try {
      const res = await apiFetch(`${API_BASE}/admin/branch-atm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          branch_name: branchName.trim(),
          region: branchLocation.trim(),
          terminal_id: terminalId.trim(),
          model: atmModel
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRegistrationMessage(`${branchName.trim()} and terminal ${terminalId.trim()} are registered and ready to use.`);
        setNewTerminal(terminalId.trim());
        setBranchName('');
        setBranchLocation('');
        setTerminalId('');
        await Promise.all([fetchBranches(), fetchAtms()]);
      } else {
        setRegistrationError(data.error || `Registration failed (HTTP ${res.status}). Please check the branch and terminal details.`);
      }
    } catch (e) {
      setRegistrationError('Could not reach the registration service. Check that the application services are running, then try again.');
    } finally {
      setRegisteringTerminal(false);
    }
  };

  const handleDeleteAtm = async (id) => {
    if (!confirm('Are you sure you want to remove this ATM terminal?')) return;
    try {
      const res = await apiFetch(`${API_BASE}/admin/atm/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAtms();
        fetchBranches();
      }
    } catch (e) { alert('Failed to delete ATM'); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserError('');
    setUserMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/admin/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          full_name: newFullName,
          email: newEmail,
          role: newUserRole,
          branch_id: newUserRole === 'BRANCH' ? newUserBranchId : null,
          terminal_ids: newUserRole === 'BRANCH' ? newUserTerminalIds : []
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUserError(data.error || 'Could not create user account');
        setUserMessage('');
        return;
      }
      setUserMessage(`Account created for ${data.full_name}.`);
      setUserError('');
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewEmail('');
      setNewUserBranchId('');
      setNewUserTerminalIds([]);
      await fetchUsers();
    } catch (_err) {
      setUserError('Could not connect to the account service.');
    }
  };

  const startEditingUser = (account) => {
    setEditingUserId(account.id);
    setEditingUser({
      username: account.username,
      full_name: account.full_name,
      email: account.email || '',
      role: account.role,
      branch_id: account.branch_id ? String(account.branch_id) : '',
      terminal_ids: account.terminal_ids || [],
      password: ''
    });
    setUserError('');
    setUserMessage('');
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUserId || !editingUser) return;
    setUserError('');
    setUserMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/admin/user/${editingUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingUser,
          branch_id: editingUser.role === 'BRANCH' ? editingUser.branch_id : null,
          terminal_ids: editingUser.role === 'BRANCH' ? editingUser.terminal_ids : [],
          ...(editingUser.password ? {} : { password: undefined })
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUserError(data.error || 'Could not update user account');
        return;
      }
      setUserMessage(`Account for ${data.full_name} updated.`);
      setEditingUserId(null);
      setEditingUser(null);
      await fetchUsers();
    } catch (_err) {
      setUserError('Could not connect to the account service.');
    }
  };

  const handleDeleteUser = async (account) => {
    if (!confirm(`Delete the account for ${account.full_name} (${account.username})?`)) return;
    setUserError('');
    setUserMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/admin/user/${account.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUserError(data.error || 'Could not delete user account');
        return;
      }
      setUserMessage(`Account for ${account.full_name} deleted.`);
      await fetchUsers();
    } catch (_err) {
      setUserError('Could not connect to the account service.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'BRANCH_CONFIRMED':
        return <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Confirmed</span>;
      case 'VENDOR_COMPLETED':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Pending Confirmation</span>;
      case 'BRANCH_DISPUTED':
        return <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Disputed</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Scheduled</span>;
    }
  };

  const branchConfirmationsPending = visits.filter((visit) => visit.status === 'VENDOR_COMPLETED').length;
  const branchVisitsWaitingOnVendor = visits.filter((visit) => visit.status === 'SCHEDULED').length;
  const today = (() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  })();
  const notifications = visits.flatMap((visit) => {
    const scheduledDate = String(visit.scheduled_date).slice(0, 10);
    const isOverdue = scheduledDate < today;
    const notification = (type, title, message) => ({
      id: `${type}:${visit.id}:${scheduledDate}`,
      visitId: visit.id,
      title,
      message,
      overdue: type.includes('overdue')
    });

    if (role === 'VENDOR' && visit.status === 'SCHEDULED') {
      return [notification(
        isOverdue ? 'vendor-overdue' : 'vendor-new-schedule',
        isOverdue ? 'Overdue PM schedule' : 'New PM schedule',
        `${visit.terminal_id} at ${visit.branch_name} — scheduled ${scheduledDate}.`
      )];
    }
    if (role === 'BRANCH' && visit.status === 'VENDOR_COMPLETED') {
      return [notification(
        isOverdue ? 'branch-overdue-confirmation' : 'branch-new-confirmation',
        isOverdue ? 'Overdue branch confirmation' : 'Maintenance ready to confirm',
        `${visit.terminal_id} at ${visit.branch_name} — scheduled ${scheduledDate}.`
      )];
    }
    if (role === 'ADMIN' && visit.status === 'SCHEDULED' && isOverdue) {
      return [notification(
        'admin-overdue-vendor',
        'Overdue: Moti completion needed',
        `${visit.terminal_id} at ${visit.branch_name} — scheduled ${scheduledDate}.`
      )];
    }
    if (role === 'ADMIN' && visit.status === 'VENDOR_COMPLETED' && isOverdue) {
      return [notification(
        'admin-overdue-branch',
        'Overdue: branch confirmation needed',
        `${visit.terminal_id} at ${visit.branch_name} — scheduled ${scheduledDate}.`
      )];
    }
    return [];
  });
  const notificationsReady = notificationReadKey === currentNotificationReadKey;
  const unreadNotificationCount = notificationsReady
    ? notifications.filter((notification) => !readNotificationIds.includes(notification.id)).length
    : 0;

  const markNotificationsRead = (ids) => {
    const updated = [...new Set([...readNotificationIds, ...ids])];
    setReadNotificationIds(updated);
    if (currentNotificationReadKey) {
      localStorage.setItem(currentNotificationReadKey, updated.join('\n'));
    }
  };

  const openNotification = (notification) => {
    markNotificationsRead([notification.id]);
    setNotificationsOpen(false);
    if (role === 'ADMIN') {
      setAdminSection('schedules');
      return;
    }
    const visit = visits.find((item) => item.id === notification.visitId);
    if (visit) setActiveModalVisit(visit);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        Checking your session...
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <section className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
          <div className="flex items-center gap-4 mb-8">
            <img src="/enat.png" alt="Enat Bank logo" className="h-16 w-20 shrink-0 rounded-lg bg-white object-contain" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Enat &amp; Moti PM Tracking</h1>
              <p className="text-sm text-slate-500">Sign in to your assigned workspace</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="login-username" className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
              <input
                id="login-username"
                autoComplete="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            {loginError && <p role="alert" className="text-sm text-red-700">{loginError}</p>}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 transition"
            >
              {loggingIn ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-6 text-center">
            Your access and branch data are determined by your assigned account.
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-indigo-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/enat.png" alt="Enat Bank logo" className="h-12 w-16 shrink-0 rounded-lg bg-white p-1 object-contain" />
            <div>
              <h1 className="text-xl font-bold tracking-wide">ATM Preventive Maintenance Automation</h1>
              <p className="text-xs text-indigo-300">Enat Bank Dbs Teams & Moti Engineering PM Verification Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ''}`}
                aria-expanded={notificationsOpen}
                className="relative rounded-lg p-2 text-indigo-100 hover:bg-indigo-800"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                      <h2 className="font-bold">Notifications</h2>
                      <p className="text-xs text-slate-500">Updates every minute while you are signed in</p>
                    </div>
                    <button
                      type="button"
                      disabled={!unreadNotificationCount}
                      onClick={() => markNotificationsRead(notifications.map((notification) => notification.id))}
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:cursor-default disabled:text-slate-400"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-500">You’re all caught up.</p>
                    ) : notifications.map((notification) => {
                      const unread = notificationsReady && !readNotificationIds.includes(notification.id);
                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => openNotification(notification)}
                          className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${
                            unread ? 'bg-indigo-50/70' : 'bg-white'
                          }`}
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span className="flex items-start gap-2">
                              {notification.overdue && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
                              <span>
                                <span className="block text-sm font-semibold">{notification.title}</span>
                                <span className="mt-1 block text-xs text-slate-600">{notification.message}</span>
                              </span>
                            </span>
                            {unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600" aria-label="Unread" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{user.full_name}</p>
              <p className="text-xs text-indigo-300">
                {role === 'ADMIN' ? 'IT Operations Admin' : role === 'VENDOR' ? 'Moti Tech' : user.branch_name || 'Branch User'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg bg-indigo-950 px-3 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-800"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* KPI Metrics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">Total PM Visits</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{analytics.total_visits || 0}</h3>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">Pending Confirmation</p>
              <h3 className="text-2xl font-black text-blue-600 mt-1">{analytics.pending_branch || 0}</h3>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">Confirmed Cleaned</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{analytics.confirmed || 0}</h3>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">Avg Cleanliness Rating</p>
              <h3 className="text-2xl font-black text-amber-500 mt-1">{analytics.avg_rating || 'N/A'} ★</h3>
            </div>
          </div>
        )}

        {/* Branch users are always scoped to their assigned branch. */}
        {role === 'BRANCH' && (
          <div className="mb-6 space-y-3">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-semibold text-slate-700">Your branch</span>
              </div>
              <span className="text-sm text-slate-600">{user.branch_name || 'No branch assigned'}</span>
            </div>
            <div
              role="status"
              className={`rounded-xl border p-4 text-sm ${
                branchConfirmationsPending
                  ? 'border-blue-200 bg-blue-50 text-blue-900'
                  : atms.length === 0 || visits.length === 0
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {branchConfirmationsPending > 0 ? (
                <p>
                  <strong>{branchConfirmationsPending} maintenance {branchConfirmationsPending === 1 ? 'visit is' : 'visits are'} ready for your confirmation.</strong>
                  {' '}Choose <strong>Verify &amp; Confirm</strong> in the visit row.
                </p>
              ) : atms.length === 0 ? (
                <p><strong>No ATM terminals are assigned to this branch yet.</strong> Ask an administrator to register a terminal for {user.branch_name || 'your branch'} and schedule preventive maintenance.</p>
              ) : visits.length === 0 ? (
                <p><strong>No maintenance visits are scheduled for this branch.</strong> Ask an administrator to create a PM schedule for one of your branch terminals.</p>
              ) : branchVisitsWaitingOnVendor > 0 ? (
                <p><strong>No visits are ready for branch confirmation yet.</strong> {branchVisitsWaitingOnVendor} {branchVisitsWaitingOnVendor === 1 ? 'scheduled visit is' : 'scheduled visits are'} waiting for the Moti technician to submit completion details.</p>
              ) : (
                <p><strong>No pending confirmations.</strong> Your branch’s maintenance visits are up to date. You can review completed visit details below.</p>
              )}
            </div>
          </div>
        )}

        {/* Admin Management Section */}
        {role === 'ADMIN' && (
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:sticky md:top-24">
              <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">Admin workspace</p>
              {[
                { id: 'schedules', label: 'Schedules', icon: Wrench },
                { id: 'branches', label: 'Branch & Terminal Registration', icon: Building2 },
                { id: 'users', label: 'User Accounts', icon: User },
                { id: 'terminals', label: 'Registered Terminals', icon: Trash2 }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAdminSection(id)}
                  aria-current={adminSection === id ? 'page' : undefined}
                  className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                    adminSection === id ? 'bg-indigo-50 text-indigo-800' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </aside>

            <div className="min-w-0 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-800">
                  {adminSection === 'schedules' ? 'Schedules'
                    : adminSection === 'branches' ? 'Branch & Terminal Registration'
                      : adminSection === 'users' ? 'User Accounts'
                        : 'Registered Terminals'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowScheduleImport((visible) => !visible)}
                  aria-expanded={showScheduleImport}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  {showScheduleImport ? 'Close Excel Import' : 'Import Excel Schedule'}
                </button>
              </div>

              {showScheduleImport && (
                <div id="excel-schedule-import" className="scroll-mt-24 rounded-xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Upload PM Schedule from Excel</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Select an .xlsx workbook to import schedules. Each terminal must already be registered to the branch named in the workbook.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Required columns: Branch Name, Terminal ID, Scheduled Date. Excel dates or YYYY-MM-DD dates are accepted.</p>
                    </div>
                    <button type="button" onClick={handleDownloadScheduleTemplate} className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                      Download Excel Template
                    </button>
                  </div>
                  <form onSubmit={handleScheduleImport} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label htmlFor="schedule-workbook" className="mb-1 block text-xs font-bold uppercase text-slate-600">Choose Excel workbook (.xlsx, max 2 MB)</label>
                      <input
                        id="schedule-workbook"
                        type="file"
                        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={(e) => {
                          setScheduleWorkbook(e.target.files?.[0] || null);
                          setScheduleImportError('');
                          setScheduleImportMessage('');
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <button type="submit" disabled={importingSchedule || !scheduleWorkbook} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                      {importingSchedule ? 'Importing…' : 'Upload and Import Schedule'}
                    </button>
                  </form>
                  {(scheduleImportError || scheduleImportMessage) && (
                    <p role={scheduleImportError ? 'alert' : 'status'} className={`mt-3 text-sm ${scheduleImportError ? 'text-red-700' : 'text-emerald-700'}`}>
                      {scheduleImportError || scheduleImportMessage}
                    </p>
                  )}
                </div>
              )}

            {/* 1. Unified Branch & Terminal Registration Form */}
            {adminSection === 'branches' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <Building2 className="h-5 w-5 text-indigo-600" /> Add New Branch & Register ATM Terminal ID
              </h3>
              <form onSubmit={handleRegisterBranchAndAtm} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Piassa Branch"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Location / Region</label>
                  <input
                    type="text"
                    value={branchLocation}
                    onChange={(e) => setBranchLocation(e.target.value)}
                    placeholder="e.g. Addis Ababa"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Terminal ID</label>
                  <input
                    type="text"
                    value={terminalId}
                    onChange={(e) => setTerminalId(e.target.value)}
                    placeholder="e.g. ET00501"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <button type="submit" disabled={registeringTerminal} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait text-white font-semibold py-2 px-4 rounded-lg text-sm transition">
                  {registeringTerminal ? 'Registering…' : 'Save Branch & Terminal'}
                </button>
                {(registrationMessage || registrationError) && (
                  <p role={registrationError ? 'alert' : 'status'} className={`md:col-span-4 text-sm ${registrationError ? 'text-red-700' : 'text-emerald-700'}`}>
                    {registrationError || registrationMessage}
                  </p>
                )}
              </form>
            </div>
            )}

            {/* 2. Schedule Work Order */}
            {adminSection === 'schedules' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <Plus className="h-5 w-5 text-indigo-600" /> Schedule Vendor Maintenance Work Order
              </h3>
              <form onSubmit={handleCreateSchedule} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Target ATM</label>
                  <select
                    value={newTerminal}
                    onChange={(e) => setNewTerminal(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    required
                  >
                    {atms.map(a => (
                      <option key={a.id} value={a.terminal_id}>{a.terminal_id} ({a.branch_name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-4 rounded-lg text-sm transition">
                  Dispatch Schedule to Moti
                </button>
              </form>
            </div>
            )}

            {/* User accounts */}
            {adminSection === 'users' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-800">
                Manage Users ({users.length})
              </div>
              <p className="px-6 pt-4 text-sm text-slate-600">
                Manage users and assign registered branches and terminals.
              </p>
              {users.some((account) => !account.email?.trim()) && (
                <p role="status" className="mx-6 mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  Add a real email address to every existing account using Edit. Email notifications remain unavailable until all user accounts have an address.
                </p>
              )}
              <form onSubmit={handleCreateUser} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Full Name</label>
                  <input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Address</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required maxLength={254} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Username</label>
                  <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} autoComplete="off" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Temporary Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => {
                      setNewUserRole(e.target.value);
                      setNewUserBranchId('');
                      setNewUserTerminalIds([]);
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="VENDOR">Moti Tech</option>
                    <option value="BRANCH">Branch User</option>
                    <option value="ADMIN">IT Operations Admin</option>
                  </select>
                </div>
                {newUserRole === 'BRANCH' && (
                  <fieldset className="md:col-span-3">
                    <legend className="mb-2 block text-xs font-bold uppercase text-slate-600">Branch and Allowed Terminal IDs</legend>
                    <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="new-user-branch">Branch ID</label>
                    <select
                      id="new-user-branch"
                      value={newUserBranchId}
                      onChange={(e) => {
                        setNewUserBranchId(e.target.value);
                        setNewUserTerminalIds([]);
                      }}
                      className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select a branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={String(branch.id)}>{branch.id} — {branch.branch_name}</option>
                      ))}
                    </select>
                    <p className="mb-2 text-xs text-slate-500">Choose the branch first, then select only terminals registered to that branch.</p>
                    <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {atms.filter((atm) => String(atm.branch_id) === newUserBranchId && atm.is_active !== false).map((atm) => (
                        <label key={atm.terminal_id} className="flex items-start gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={newUserTerminalIds.includes(atm.terminal_id)}
                            onChange={(e) => setNewUserTerminalIds((current) => e.target.checked
                              ? [...current, atm.terminal_id]
                              : current.filter((id) => id !== atm.terminal_id))}
                            className="mt-1 accent-indigo-600"
                          />
                          <span>{atm.terminal_id}<span className="block text-xs text-slate-500">{atm.branch_name}</span></span>
                        </label>
                      ))}
                      {!newUserBranchId && <p className="text-sm text-slate-500">Select a branch to see its registered terminals.</p>}
                      {newUserBranchId && atms.filter((atm) => String(atm.branch_id) === newUserBranchId && atm.is_active !== false).length === 0 && (
                        <p className="text-sm text-slate-500">No active terminals are registered to this branch.</p>
                      )}
                    </div>
                  </fieldset>
                )}
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition">
                  Create Account
                </button>
                {(userMessage || userError) && (
                  <p role={userError ? 'alert' : 'status'} className={`md:col-span-3 text-sm ${userError ? 'text-red-700' : 'text-emerald-700'}`}>
                    {userError || userMessage}
                  </p>
                )}
              </form>
              <div className="overflow-x-auto border-t border-slate-200">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100/70 text-xs font-bold text-slate-500 uppercase">
                      <th className="p-3">Name</th><th className="p-3">Username</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Branch ID</th><th className="p-3">Branch / Terminals</th><th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {users.map((account) => (
                      <tr key={account.id}>
                        <td className="p-3">{account.full_name}</td>
                        <td className="p-3">{account.username}</td>
                        <td className={`p-3 ${account.email ? '' : 'font-semibold text-amber-800'}`}>{account.email || 'Required — edit account'}</td>
                        <td className="p-3">{account.role}</td>
                        <td className="p-3">{account.role === 'BRANCH' ? account.branch_id : '—'}</td>
                        <td className="p-3">
                          {account.role === 'BRANCH'
                            ? <>{account.branch_name || '—'}<span className="block text-xs text-slate-500">{(account.terminal_ids || []).join(', ') || 'No terminals assigned'}</span></>
                            : '—'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => startEditingUser(account)} className="text-indigo-700 hover:text-indigo-900 font-semibold">
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(account)}
                              disabled={account.id === user.id}
                              className="text-red-600 hover:text-red-800 disabled:text-slate-300 disabled:cursor-not-allowed"
                              title={account.id === user.id ? 'You cannot delete your own account' : 'Delete account'}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                  <form onSubmit={handleUpdateUser} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-slate-800">Edit User Account</h4>
                      <button type="button" onClick={() => { setEditingUserId(null); setEditingUser(null); }} aria-label="Close edit user form" className="text-slate-500 hover:text-slate-800">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Full Name</label>
                      <input value={editingUser.full_name} onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Username</label>
                      <input value={editingUser.username} onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })} autoComplete="off" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Email Address</label>
                      <input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} maxLength={254} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Role</label>
                      <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({
                          ...editingUser,
                          role: e.target.value,
                          branch_id: '',
                          terminal_ids: []
                        })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="VENDOR">Moti Tech</option>
                        <option value="BRANCH">Branch User</option>
                        <option value="ADMIN">IT Operations Admin</option>
                      </select>
                    </div>
                    {editingUser.role === 'BRANCH' && (
                      <fieldset>
                        <legend className="mb-2 block text-xs font-bold uppercase text-slate-600">Branch and Allowed Terminal IDs</legend>
                        <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="editing-user-branch">Branch ID</label>
                        <select
                          id="editing-user-branch"
                          value={editingUser.branch_id || ''}
                          onChange={(e) => setEditingUser({
                            ...editingUser,
                            branch_id: e.target.value,
                            terminal_ids: []
                          })}
                          className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Select a branch</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={String(branch.id)}>{branch.id} — {branch.branch_name}</option>
                          ))}
                        </select>
                        <p className="mb-2 text-xs text-slate-500">Select allowed terminals from this branch only.</p>
                        <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                          {atms.filter((atm) => String(atm.branch_id) === String(editingUser.branch_id) && atm.is_active !== false).map((atm) => (
                            <label key={atm.terminal_id} className="flex items-start gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={editingUser.terminal_ids.includes(atm.terminal_id)}
                                onChange={(e) => setEditingUser({
                                  ...editingUser,
                                  terminal_ids: e.target.checked
                                    ? [...editingUser.terminal_ids, atm.terminal_id]
                                    : editingUser.terminal_ids.filter((id) => id !== atm.terminal_id)
                                })}
                                className="mt-1 accent-indigo-600"
                              />
                              <span>{atm.terminal_id}<span className="block text-xs text-slate-500">{atm.branch_name}</span></span>
                            </label>
                          ))}
                          {!editingUser.branch_id && <p className="text-sm text-slate-500">Select a branch to see its registered terminals.</p>}
                          {editingUser.branch_id && atms.filter((atm) => String(atm.branch_id) === String(editingUser.branch_id) && atm.is_active !== false).length === 0 && (
                            <p className="text-sm text-slate-500">No active terminals are registered to this branch.</p>
                          )}
                        </div>
                      </fieldset>
                    )}
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-600">New Password (optional)</label>
                      <input type="password" value={editingUser.password} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} autoComplete="new-password" minLength={8} placeholder="Leave blank to keep current password" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    {userError && <p role="alert" className="text-sm text-red-700">{userError}</p>}
                    <div className="flex justify-end gap-3 pt-2">
                      <button type="button" onClick={() => { setEditingUserId(null); setEditingUser(null); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                      <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Save Changes</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
            )}

            {/* 3. Manage Registered ATM Terminals Table */}
            {adminSection === 'terminals' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-800">
                Manage Registered ATM Terminals & Branches ({atms.length})
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <th className="p-3">Terminal ID</th>
                    <th className="p-3">Branch Name</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {atms.map((atm) => (
                    <tr key={atm.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-indigo-900">{atm.terminal_id}</td>
                      <td className="p-3 text-slate-700">{atm.branch_name}</td>
                      <td className="p-3 text-slate-600">{atm.region}</td>
                      <td className="p-3 text-slate-600">{atm.model}</td>
                      <td className="p-3">
                        <button 
                          onClick={() => handleDeleteAtm(atm.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded transition"
                          title="Delete Terminal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {adminSection === 'schedules' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <h3 className="flex items-center gap-2 font-bold text-slate-800">
                    <Wrench className="h-5 w-5 text-indigo-600" /> Maintenance Schedule & Confirmations
                  </h3>
                  <button type="button" onClick={fetchVisits} aria-label="Refresh schedules" className="rounded p-1 text-slate-500 hover:text-indigo-600">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-slate-500">Loading schedule records...</div>
                ) : visits.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No PM records found for this view.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/70 text-xs font-bold uppercase text-slate-500">
                          <th className="p-4">Terminal ID</th>
                          <th className="p-4">Branch</th>
                          <th className="p-4">Scheduled Date</th>
                          <th className="p-4">Vendor</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {visits.map((visit) => (
                          <tr key={visit.id} className="transition hover:bg-slate-50/80">
                            <td className="p-4 font-mono font-bold text-indigo-900">{visit.terminal_id}</td>
                            <td className="p-4 text-slate-700">{visit.branch_name}</td>
                            <td className="p-4 text-slate-600">{new Date(visit.scheduled_date).toLocaleDateString()}</td>
                            <td className="p-4 font-medium text-slate-600">{visit.vendor_name}</td>
                            <td className="p-4">{getStatusBadge(visit.status)}</td>
                            <td className="p-4">
                              {visit.status === 'SCHEDULED' ? (
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setScheduleError('');
                                      setEditingSchedule({
                                        id: visit.id,
                                        terminal_id: visit.terminal_id,
                                        scheduled_date: String(visit.scheduled_date).slice(0, 10)
                                      });
                                    }}
                                    className="font-semibold text-indigo-700 hover:text-indigo-900"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSchedule(visit)}
                                    className="font-semibold text-red-600 hover:text-red-800"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveModalVisit(visit)}
                                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
                                >
                                  View Details
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        )}

        {/* PM Visits Data Table */}
        {role !== 'ADMIN' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-600" /> Maintenance Schedule & Confirmations
            </h2>
            <button onClick={fetchVisits} className="text-slate-500 hover:text-indigo-600 p-1 rounded">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <details open>
            <summary className="cursor-pointer px-6 py-3 text-sm font-semibold text-indigo-800 hover:bg-indigo-50">
              View schedule list ({visits.length})
            </summary>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading schedule records...</div>
          ) : visits.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {role === 'BRANCH'
                ? atms.length === 0
                  ? 'No terminals or maintenance records are assigned to your branch yet.'
                  : 'No maintenance visits have been scheduled for your branch yet.'
                : 'No PM records found for this view.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                  <th className="p-4">Terminal ID</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Scheduled Date</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono font-bold text-indigo-900">{visit.terminal_id}</td>
                    <td className="p-4 text-slate-700">{visit.branch_name}</td>
                    <td className="p-4 text-slate-600">{new Date(visit.scheduled_date).toLocaleDateString()}</td>
                    <td className="p-4 text-slate-600 font-medium">{visit.vendor_name}</td>
                    <td className="p-4">{getStatusBadge(visit.status)}</td>
                    <td className="p-4">
                      {role === 'VENDOR' && visit.status === 'SCHEDULED' && (
                        <button
                          onClick={() => setActiveModalVisit(visit)}
                          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-xs px-3 py-1.5 rounded-md transition"
                        >
                          Complete PM
                        </button>
                      )}

                      {role === 'BRANCH' && visit.status === 'VENDOR_COMPLETED' && (
                        <button
                          onClick={() => setActiveModalVisit(visit)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-md transition"
                        >
                          Verify & Confirm
                        </button>
                      )}

                      {role === 'BRANCH' && visit.status === 'SCHEDULED' && (
                        <span className="text-xs text-slate-500">Awaiting vendor completion</span>
                      )}

                      {role === 'ADMIN' && visit.status === 'SCHEDULED' && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setScheduleError('');
                              setEditingSchedule({
                                id: visit.id,
                                terminal_id: visit.terminal_id,
                                scheduled_date: String(visit.scheduled_date).slice(0, 10)
                              });
                            }}
                            className="font-semibold text-indigo-700 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(visit)}
                            className="font-semibold text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      )}

                      {(visit.status === 'BRANCH_CONFIRMED' || visit.status === 'BRANCH_DISPUTED') && (
                        <button
                          onClick={() => setActiveModalVisit(visit)}
                          className="text-slate-500 hover:underline text-xs"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </details>
        </div>
        )}
      </main>

      {editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={handleUpdateSchedule} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Edit PM Schedule</h3>
              <button type="button" onClick={() => setEditingSchedule(null)} aria-label="Close schedule editor" className="text-slate-500 hover:text-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Terminal ID</label>
              <select
                value={editingSchedule.terminal_id}
                onChange={(e) => setEditingSchedule({ ...editingSchedule, terminal_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              >
                {atms.filter((atm) => atm.is_active !== false).map((atm) => (
                  <option key={atm.terminal_id} value={atm.terminal_id}>{atm.terminal_id} — {atm.branch_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Scheduled Date</label>
              <input
                type="date"
                value={editingSchedule.scheduled_date}
                onChange={(e) => setEditingSchedule({ ...editingSchedule, scheduled_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            {scheduleError && <p role="alert" className="text-sm text-red-700">{scheduleError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditingSchedule(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                Cancel
              </button>
              <button type="submit" disabled={savingSchedule} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {savingSchedule ? 'Saving…' : 'Save Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Action Modal */}
      {activeModalVisit && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">
                PM Action Log - {activeModalVisit.terminal_id} ({activeModalVisit.branch_name})
              </h3>
              <button onClick={() => setActiveModalVisit(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Vendor Completion Form */}
              {role === 'VENDOR' && activeModalVisit.status === 'SCHEDULED' && (
                <form onSubmit={handleVendorComplete} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Technician Name</label>
                    <input
                      type="text"
                      value={vendorTech}
                      onChange={(e) => setVendorTech(e.target.value)}
                      placeholder="e.g. Abebe Kebede"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Maintenance Summary & Cleaned Items</label>
                    <textarea
                      value={vendorNotes}
                      onChange={(e) => setVendorNotes(e.target.value)}
                      placeholder="Vacuumed interior, cleaned fascia, screen, replaced printer roll..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-24"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-sm">
                    Submit PM Completion for Branch Verification
                  </button>
                </form>
              )}

              {/* Branch Verification Form */}
              {role === 'BRANCH' && activeModalVisit.status === 'VENDOR_COMPLETED' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p><strong>Technician:</strong> {activeModalVisit.vendor_technician}</p>
                    <p><strong>Vendor Notes:</strong> {activeModalVisit.vendor_notes}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Cleanliness Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`p-2 rounded-lg border text-lg ${rating >= star ? 'border-amber-400 bg-amber-50 text-amber-500' : 'border-slate-200 text-slate-300'}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Remarks / Remarks on Service</label>
                    <textarea
                      value={branchRemarks}
                      onChange={(e) => setBranchRemarks(e.target.value)}
                      placeholder="Cleanliness verified..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-20"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleBranchAction('BRANCH_CONFIRMED')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-sm"
                    >
                      Confirm Cleaned
                    </button>
                    <button
                      onClick={() => handleBranchAction('BRANCH_DISPUTED')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-sm"
                    >
                      Reject — Not Resolved
                    </button>
                  </div>
                </div>
              )}

              {/* View Read-Only Details */}
              {(role === 'ADMIN' ||
                activeModalVisit.status === 'BRANCH_CONFIRMED' ||
                activeModalVisit.status === 'BRANCH_DISPUTED') && (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Schedule Status</p>
                    <div className="mt-1">{getStatusBadge(activeModalVisit.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Scheduled Date</p>
                    <p className="text-slate-700">{new Date(activeModalVisit.scheduled_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Vendor</p>
                    <p className="text-slate-700">{activeModalVisit.vendor_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Vendor Technician</p>
                    <p className="font-semibold text-slate-800">{activeModalVisit.vendor_technician || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Maintenance Log</p>
                    <p className="text-slate-700">{activeModalVisit.vendor_notes || 'N/A'}</p>
                  </div>
                  {activeModalVisit.status === 'VENDOR_COMPLETED' ? (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Branch Review</p>
                      <p className="text-slate-700">Awaiting branch confirmation</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Branch Decision By</p>
                        <p className="text-slate-700">{activeModalVisit.branch_confirmed_by || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">
                          {activeModalVisit.status === 'BRANCH_DISPUTED' ? 'Rejection Reason' : 'Branch Remarks'}
                        </p>
                        <p className="whitespace-pre-wrap text-slate-700">{activeModalVisit.branch_remarks || 'No reason or remarks provided'}</p>
                      </div>
                      {activeModalVisit.status === 'BRANCH_CONFIRMED' && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Cleanliness Rating</p>
                          <p className="font-bold text-amber-500">
                            {activeModalVisit.cleanliness_rating
                              ? `${activeModalVisit.cleanliness_rating} / 5 ★`
                              : 'No rating provided'}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
