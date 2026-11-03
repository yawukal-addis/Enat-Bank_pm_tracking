import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, Clock, AlertTriangle, Building2, Wrench, Bell, Pencil,
  RefreshCw, X, Plus, Trash2, LogOut, User, Download
} from 'lucide-react';

const API_BASE = '/api';

const PM_CHECKLIST = [
  {
    key: 'upper_chamber',
    title: 'Upper Chamber',
    fields: [
      { key: 'card_reader_clean', label: 'Card reader cleaned', type: 'task' },
      { key: 'pulley_condition', label: 'Pulley condition', type: 'choice', options: ['Good', 'Normal', 'Poor'] },
      { key: 'motor_status', label: 'Motor status', type: 'choice', options: ['Easy', 'Jam'] },
      { key: 'receipt_printer_clean', label: 'Receipt printer cleaned', type: 'task' },
      { key: 'receipt_printer_health', label: 'Receipt printer health', type: 'choice', options: ['Healthy', 'Not healthy'] },
      { key: 'receipt_paper', label: 'Receipt paper', type: 'choice', options: ['Full', 'Low', 'Empty'] },
      { key: 'journal_printer_clean', label: 'Journal printer cleaned', type: 'task' },
      { key: 'journal_printer_health', label: 'Journal printer health', type: 'choice', options: ['Healthy', 'Not healthy'] },
      { key: 'journal_paper', label: 'Journal paper', type: 'choice', options: ['Full', 'Low', 'Empty'] },
      { key: 'pe_core_clean', label: 'PE core cleaned', type: 'task' },
      { key: 'maintenance_keyboard_clean', label: 'Maintenance keyboard cleaned', type: 'task' },
      { key: 'pe_core_brightness', label: 'PE core brightness', type: 'choice', options: ['Low', 'Medium', 'High'] },
      { key: 'lcd_crt_clean', label: 'LCD/CRT cleaned', type: 'task' },
      { key: 'lcd_crt_condition', label: 'LCD/CRT condition', type: 'choice', options: ['Good', 'Dark'] },
      { key: 'epp_clean', label: 'EPP cleaned', type: 'task' },
      { key: 'epp_health', label: 'EPP health', type: 'choice', options: ['Healthy', 'Not healthy'] },
      { key: 'epp_sound', label: 'EPP sound', type: 'choice', options: ['Low', 'Medium', 'High'] },
      { key: 'fdk_clean', label: 'FDK cleaned', type: 'task' },
      { key: 'fdk_health', label: 'FDK health', type: 'choice', options: ['Healthy', 'Not healthy'] },
      { key: 'cabinetry_clean', label: 'Cabinetry cleaned', type: 'task' },
      { key: 'fascia_molding_clean', label: 'Fascia molding cleaned', type: 'task' },
    ],
  },
  {
    key: 'lower_chamber',
    title: 'Lower Chamber',
    fields: [
      { key: 'presenter_module_clean', label: 'Presenter module cleaned', type: 'task' },
      { key: 'presenter_lvdt_clean', label: 'Presenter LVDT cleaned', type: 'task' },
      { key: 'presenter_sector_clean', label: 'All presenter sectors cleaned', type: 'task' },
      { key: 'transport_belt_clean', label: 'Transport belt cleaned', type: 'task' },
      { key: 'timing_disk_clean', label: 'Timing disk cleaned', type: 'task' },
      { key: 'paddle_wheel_clean', label: 'Paddle wheel cleaned', type: 'task' },
      { key: 'air_filter_clean', label: 'Air filter cleaned', type: 'task' },
      { key: 'harness_clean', label: 'Harness cleaned', type: 'task' },
      { key: 'bin_catch_condition', label: 'Bin catch condition', type: 'choice', options: ['Good', 'Broken'] },
      { key: 'presenter_sound', label: 'Presenter sound', type: 'choice', options: ['Good', 'Noisy', 'Loud'] },
      { key: 'shutter_assembly_clean', label: 'Shutter assembly cleaned', type: 'task' },
      { key: 'bearing_clean', label: 'Bearing cleaned', type: 'task' },
      { key: 'pick_module_clean', label: 'Pick module cleaned', type: 'task' },
      { key: 'pick_module_belt_clean', label: 'All pick-module belts cleaned', type: 'task' },
      { key: 'pick_module_timing_disk_set', label: 'Pick-module timing disk set', type: 'task' },
      { key: 'pick_module_d_wheel_set', label: 'Pick-module D wheel set', type: 'task' },
      { key: 'sensor_clean', label: 'Sensor cleaned', type: 'task' },
      { key: 'suction_cap_condition', label: 'Suction cap condition', type: 'choice', options: ['Good', 'Normal', 'Poor'] },
      { key: 'pick_arm_condition', label: 'Pick arm condition', type: 'choice', options: ['Good', 'Cracked'] },
      { key: 'side_controller_board_condition', label: 'Side controller board', type: 'choice', options: ['Good', 'Broken'] },
      { key: 'solenoid_valve_clean', label: 'Solenoid valve cleaned', type: 'task' },
      { key: 'mouse_plate_clean', label: 'Mouse plate cleaned', type: 'task' },
      { key: 'safe_assembly_clean', label: 'Safe assembly cleaned', type: 'task' },
      { key: 'cosmetic_door_clean', label: 'Cosmetic door cleaned', type: 'task' },
      { key: 'cassette_pusher_status', label: 'Media cassette pusher', type: 'choice', options: ['Easy', 'Jam'] },
      { key: 'track_door_movement', label: 'Track door movement checked', type: 'task' },
    ],
  },
  {
    key: 'media_quality',
    title: 'Media Quality',
    fields: [
      { key: 'quality', label: 'Media quality', type: 'checkbox_choice', options: ['Good', 'Bad'] },
    ],
  },
  {
    key: 'site_status',
    title: 'Booth & Site Status',
    fields: [
      { key: 'booth_cooling', label: 'Booth cooling system', type: 'choice', options: ['Satisfactory', 'Not satisfactory'] },
      { key: 'cooling_period', label: 'Cooling issue period (enter N/A if satisfactory)', type: 'text' },
      { key: 'ground_wire', label: 'Power / ground wire status', type: 'choice', options: ['Ground wire OK', 'No ground wire'] },
      { key: 'link_status', label: 'Link status', type: 'choice', options: ['Connected', 'Out of service', 'In service', 'Modem problem'] },
      { key: 'camera_status', label: 'Camera status', type: 'choice', options: ['Good', 'Not good'] },
      { key: 'ej_status', label: 'EJ status', type: 'choice', options: ['Good', 'Not good'] },
    ],
  },
];

const createInitialChecklist = () => Object.fromEntries(
  PM_CHECKLIST.map((section) => [
    section.key,
    Object.fromEntries(section.fields.map((field) => [field.key, field.type === 'task' ? false : ''])),
  ])
);

const isChecklistComplete = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().length > 0;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(isChecklistComplete);
};

function ChecklistReview({ checklist }) {
  if (!checklist) return <p className="text-sm text-slate-500">No inspection checklist recorded.</p>;
  return (
    <div className="space-y-3">
      {PM_CHECKLIST.map((section) => (
        <section key={section.key} className="rounded-lg border border-slate-200 p-3">
          <h4 className="mb-2 text-xs font-bold uppercase text-slate-600">{section.title}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {section.fields.map((field) => {
              const value = checklist[section.key]?.[field.key];
              const shownValue = field.type === 'task'
                ? (value ? 'Verified' : 'Not verified')
                : (value ? value.replace(/_/g, ' ').toLowerCase() : 'Not recorded');
              return (
                <p key={field.key} className="text-xs text-slate-700">
                  <strong>{field.label}:</strong> {shownValue}
                  {field.type === 'number' && value !== '' ? '%' : ''}
                </p>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const getLocalDateTimeInputValue = () => {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 16);
};

const getLocalMonthValue = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatLocalDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const formatScheduleRange = (visit) => {
  const start = visit?.scheduled_date ? formatDate(visit.scheduled_date) : 'N/A';
  const end = visit?.scheduled_end_date ? formatDate(visit.scheduled_end_date) : null;
  if (!end || end === start) return start;
  return `${start} to ${end}`;
};

const formatVisitDate = (visit) => {
  const value = visit?.vendor_visit_date || visit?.vendor_completed_at;
  return value ? formatDate(String(value).slice(0, 10)) : 'Not recorded';
};

const formatTime12Hour = (value) => {
  const match = typeof value === 'string' ? value.match(/^(\d{2}):(\d{2})/) : null;
  if (!match) return 'Not recorded';
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
};

function Time12HourInput({ label, value, onChange }) {
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState('');

  useEffect(() => {
    const match = typeof value === 'string' ? value.match(/^(\d{2}):(\d{2})$/) : null;
    if (!match) {
      setHour('');
      setMinute('');
      setPeriod('');
      return;
    }
    const hour24 = Number(match[1]);
    setHour(String(hour24 % 12 || 12));
    setMinute(match[2]);
    setPeriod(hour24 >= 12 ? 'PM' : 'AM');
  }, [value]);

  const updateTime = (part, nextValue) => {
    const nextHour = part === 'hour' ? nextValue : hour;
    const nextMinute = part === 'minute' ? nextValue : minute;
    const nextPeriod = part === 'period' ? nextValue : period;
    if (part === 'hour') setHour(nextValue);
    if (part === 'minute') setMinute(nextValue);
    if (part === 'period') setPeriod(nextValue);
    if (!nextHour || !nextMinute || !nextPeriod) return;
    const hour12 = Number(nextHour) % 12;
    const hour24 = hour12 + (nextPeriod === 'PM' ? 12 : 0);
    onChange(`${String(hour24).padStart(2, '0')}:${nextMinute}`);
  };

  const selectClassName = 'w-full rounded-lg border border-slate-300 px-2 py-2 text-sm';
  return (
    <fieldset>
      <legend className="mb-1 block text-xs font-bold uppercase text-slate-600">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        <select aria-label={`${label} hour`} value={hour} onChange={(e) => updateTime('hour', e.target.value)} className={selectClassName} required>
          <option value="">Hour</option>
          {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select aria-label={`${label} minute`} value={minute} onChange={(e) => updateTime('minute', e.target.value)} className={selectClassName} required>
          <option value="">Minute</option>
          {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0')).map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select aria-label={`${label} AM or PM`} value={period} onChange={(e) => updateTime('period', e.target.value)} className={selectClassName} required>
          <option value="">AM/PM</option>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </fieldset>
  );
}

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
  const [issueWorkspace, setIssueWorkspace] = useState(null);
  const [issueMonth, setIssueMonth] = useState(getLocalMonthValue);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueSaving, setIssueSaving] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueMessage, setIssueMessage] = useState('');
  const [newIssueType, setNewIssueType] = useState({ name: '' });
  const [issueTypeDrafts, setIssueTypeDrafts] = useState({});
  const [newAtmIssue, setNewAtmIssue] = useState({ terminal_id: '', issue_type_id: '', severity: 'MAJOR', reported_at: getLocalDateTimeInputValue(), description: '' });
  const [issueDrafts, setIssueDrafts] = useState({});
  const [monthlyFeeDrafts, setMonthlyFeeDrafts] = useState({});
  const [slaDrafts, setSlaDrafts] = useState({});
  const [issuePolicyDraft, setIssuePolicyDraft] = useState(null);
  const [showScheduleImport, setShowScheduleImport] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [notificationReadKey, setNotificationReadKey] = useState('');

  // Forms
  const [vendorTech, setVendorTech] = useState('');
  const [vendorNotes, setVendorNotes] = useState('');
  const [vendorVisitDate, setVendorVisitDate] = useState('');
  const [workStartTime, setWorkStartTime] = useState('');
  const [workFinishedTime, setWorkFinishedTime] = useState('');
  const [vendorChecklist, setVendorChecklist] = useState(createInitialChecklist);
  const [activeModalVisit, setActiveModalVisit] = useState(null);
  
  // Branch Action Form
  const [branchRemarks, setBranchRemarks] = useState('');
  // Admin New Schedule Form
  const [newTerminal, setNewTerminal] = useState('');
  const [newDateFrom, setNewDateFrom] = useState('');
  const [newDateTo, setNewDateTo] = useState('');
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleError, setScheduleError] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState(null);

  // Unified Branch & Terminal Form State
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [atmModel, setAtmModel] = useState('NCR SelfServ 84');
  const [atmSerialNumber, setAtmSerialNumber] = useState('');
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
  const [editingAtm, setEditingAtm] = useState(null);
  const [savingAtm, setSavingAtm] = useState(false);
  const [atmEditError, setAtmEditError] = useState('');

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

  const fetchIssueWorkspace = async (month) => {
    setIssueLoading(true);
    setIssueError('');
    try {
      const res = await apiFetch(`${API_BASE}/admin/atm-issues?month=${encodeURIComponent(month)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load ATM issue performance.');
      setIssueWorkspace(data);
      setIssueTypeDrafts(Object.fromEntries((data.issue_types || []).map((type) => [type.id, {
        name: type.name,
        is_active: type.is_active,
      }])));
      setSlaDrafts(Object.fromEntries((data.sla_settings || []).map((setting) => [
        `${setting.zone}:${setting.severity}`,
        {
          response_target_hours: setting.response_target_hours === null ? '' : String(setting.response_target_hours),
          resolution_target_hours: setting.resolution_target_hours === null ? '' : String(setting.resolution_target_hours),
        },
      ])));
      if (data.policy) {
        setIssuePolicyDraft({
          business_days: (data.policy.business_days || []).map(Number),
          business_start: String(data.policy.business_start).slice(0, 5),
          business_end: String(data.policy.business_end).slice(0, 5),
        });
      }
      setIssueDrafts(Object.fromEntries((data.issues || []).map((issue) => [issue.id, {
        terminal_id: issue.terminal_id,
        issue_type_id: String(issue.issue_type_id),
        severity: issue.severity,
        reported_at: issue.reported_at?.slice(0, 16) || '',
        description: issue.description || '',
        vendor_response_at: issue.vendor_response_at?.slice(0, 16) || '',
        resolved_at: issue.resolved_at?.slice(0, 16) || '',
        resolution_notes: issue.resolution_notes || '',
      }])));
      setMonthlyFeeDrafts(Object.fromEntries((data.monthly_metrics || []).map((metric) => [metric.terminal_id, {
        monthly_fee: metric.monthly_fee === null ? '' : String(metric.monthly_fee),
        currency: metric.currency || 'ETB',
      }])));
      setNewAtmIssue((current) => ({
        ...current,
        terminal_id: current.terminal_id || data.terminals?.find((terminal) => terminal.zone)?.terminal_id || data.terminals?.[0]?.terminal_id || '',
        issue_type_id: current.issue_type_id || String(data.issue_types?.find((type) => type.is_active)?.id || ''),
      }));
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : 'Could not load ATM issue performance.');
    } finally {
      setIssueLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'ADMIN' && adminSection === 'issues') fetchIssueWorkspace(issueMonth);
  }, [role, adminSection, issueMonth]);

  const submitIssueRequest = async (url, options, successMessage) => {
    setIssueSaving(true);
    setIssueError('');
    setIssueMessage('');
    try {
      const res = await apiFetch(url, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The ATM issue action failed.');
      setIssueMessage(successMessage);
      await fetchIssueWorkspace(issueMonth);
      return true;
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : 'Could not connect to the ATM issue service.');
      return false;
    } finally {
      setIssueSaving(false);
    }
  };

  const handleCreateIssueType = async (e) => {
    e.preventDefault();
    const success = await submitIssueRequest(`${API_BASE}/admin/atm-issues/types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newIssueType),
    }, 'Issue category saved.');
    if (success) setNewIssueType({ name: '' });
  };

  const handleUpdateIssueType = (typeId) => {
    const draft = issueTypeDrafts[typeId];
    if (!draft) return;
    return submitIssueRequest(`${API_BASE}/admin/atm-issues/types/${typeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    }, 'Issue category settings saved.');
  };

  const handleSaveSlaSettings = (e) => {
    e.preventDefault();
    return submitIssueRequest(`${API_BASE}/admin/atm-issues/sla-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: (issueWorkspace.sla_settings || []).map((setting) => {
          const draft = slaDrafts[`${setting.zone}:${setting.severity}`] || {};
          return {
            zone: setting.zone,
            severity: setting.severity,
            response_target_hours: Number(draft.response_target_hours),
            resolution_target_hours: Number(draft.resolution_target_hours),
          };
        }),
      }),
    }, 'Zone and severity SLA targets saved in hours.');
  };

  const handleSaveIssuePolicy = (e) => {
    e.preventDefault();
    return submitIssueRequest(`${API_BASE}/admin/atm-issues/policy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(issuePolicyDraft),
    }, 'Business hours saved.');
  };

  const handleUpdateTerminalZone = (terminalId, zone) => {
    return submitIssueRequest(`${API_BASE}/admin/atm-issues/terminals/${encodeURIComponent(terminalId)}/zone`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone }),
    }, `Zone updated for ${terminalId}.`);
  };

  const handleCreateAtmIssue = async (e) => {
    e.preventDefault();
    const success = await submitIssueRequest(`${API_BASE}/admin/atm-issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAtmIssue),
    }, 'ATM issue registered.');
    if (success) {
      setNewAtmIssue((current) => ({
        ...current,
        reported_at: getLocalDateTimeInputValue(),
        description: '',
      }));
    }
  };

  const handleUpdateAtmIssue = (issueId) => {
    const draft = issueDrafts[issueId];
    if (!draft) return;
    return submitIssueRequest(`${API_BASE}/admin/atm-issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...draft,
        issue_type_id: Number(draft.issue_type_id),
        vendor_response_at: draft.vendor_response_at || null,
        resolved_at: draft.resolved_at || null,
      }),
    }, 'Issue details and resolution progress saved.');
  };

  const handleDeleteAtmIssue = (issue) => {
    if (!confirm(`Delete the issue for ${issue.terminal_id} reported ${formatLocalDateTime(issue.reported_at)}? This removes it from monthly performance.`)) return;
    return submitIssueRequest(`${API_BASE}/admin/atm-issues/${issue.id}`, {
      method: 'DELETE',
    }, 'ATM issue deleted.');
  };

  const handleSaveMonthlyFee = (terminalId) => {
    const draft = monthlyFeeDrafts[terminalId];
    if (!draft) return;
    return submitIssueRequest(`${API_BASE}/admin/atm-issues/terminal-fee`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        terminal_id: terminalId,
        monthly_fee: Number(draft.monthly_fee),
        currency: draft.currency,
      }),
    }, `Recurring monthly fee saved for ${terminalId}. It applies to every reporting month.`);
  };

  const handleVendorComplete = async (e) => {
    e.preventDefault();
    if (!activeModalVisit) return;
    if (!isChecklistComplete(vendorChecklist)) {
      alert('Complete every inspection item, including selecting Good or Bad for Media Quality.');
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE}/pm/${activeModalVisit.id}/vendor-complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_technician: vendorTech,
          vendor_notes: vendorNotes,
          vendor_visit_date: vendorVisitDate,
          work_start_time: workStartTime,
          work_finished_time: workFinishedTime,
          vendor_checklist: vendorChecklist,
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActiveModalVisit(null);
        setVendorTech('');
        setVendorNotes('');
        setVendorVisitDate('');
        setWorkStartTime('');
        setWorkFinishedTime('');
        setVendorChecklist(createInitialChecklist());
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
          branch_remarks: branchRemarks
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActiveModalVisit(null);
        setBranchRemarks('');
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
    if (newDateTo && newDateTo < newDateFrom) {
      alert('The end date must be on or after the start date.');
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE}/pm/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminal_id: newTerminal,
          scheduled_date: newDateFrom,
          scheduled_end_date: newDateTo || newDateFrom,
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(data.email_warning || 'PM Visit Scheduled Successfully!');
        setNewDateFrom('');
        setNewDateTo('');
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
    if (editingSchedule.scheduled_end_date && editingSchedule.scheduled_end_date < editingSchedule.scheduled_date) {
      setScheduleError('The end date must be on or after the start date.');
      return;
    }
    setSavingSchedule(true);
    setScheduleError('');
    try {
      const res = await apiFetch(`${API_BASE}/pm/${editingSchedule.id}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminal_id: editingSchedule.terminal_id,
          scheduled_date: editingSchedule.scheduled_date,
          scheduled_end_date: editingSchedule.scheduled_end_date || editingSchedule.scheduled_date,
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
    const confirmedVisit = visit.status === 'BRANCH_CONFIRMED';
    const description = confirmedVisit
      ? 'the confirmed PM record and its maintenance/checklist history'
      : 'the scheduled PM';
    if (!confirm(`Delete ${description} for ${visit.terminal_id} on ${formatScheduleRange(visit)}? This cannot be undone.`)) return;
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

  const handleDownloadPmReport = async (visit) => {
    setDownloadingReportId(visit.id);
    try {
      const res = await apiFetch(`${API_BASE}/admin/reports/pm/${visit.id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not generate the PM report.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pm-report-${visit.terminal_id}-${String(visit.scheduled_date).slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      console.error('Failed to download PM report:', err);
      alert(err instanceof Error ? err.message : 'Could not generate the PM report.');
    } finally {
      setDownloadingReportId(null);
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
          model: atmModel.trim(),
          serial_number: atmSerialNumber.trim(),
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRegistrationMessage(`${branchName.trim()} and terminal ${terminalId.trim()} are registered and ready to use.`);
        setNewTerminal(terminalId.trim());
        setBranchName('');
        setBranchLocation('');
        setTerminalId('');
        setAtmSerialNumber('');
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

  const handleUpdateAtm = async (e) => {
    e.preventDefault();
    if (!editingAtm) return;
    setSavingAtm(true);
    setAtmEditError('');
    try {
      const res = await apiFetch(`${API_BASE}/admin/atm/${editingAtm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminal_id: editingAtm.terminal_id.trim(),
          model: editingAtm.model.trim(),
          serial_number: editingAtm.serial_number.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAtmEditError(data.error || 'Failed to update registered ATM terminal.');
        return;
      }
      if (newTerminal === editingAtm.original_terminal_id) setNewTerminal(data.terminal_id);
      setEditingAtm(null);
      await Promise.all([fetchAtms(), fetchVisits(), fetchAnalytics(), fetchUsers()]);
    } catch (_err) {
      setAtmEditError('Could not connect to the terminal management service.');
    } finally {
      setSavingAtm(false);
    }
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
  const issueMetrics = issueWorkspace?.monthly_metrics || [];
  const totalLoggedIssues = issueMetrics.reduce((total, item) => total + Number(item.issue_count || 0), 0);
  const totalBreachedIssues = issueMetrics.reduce((total, item) => total + Number(item.resolution_breached_count || 0), 0);
  const issuePenaltyTotals = issueMetrics.reduce((totals, item) => {
    if (item.penalty_amount !== null && item.monthly_fee !== null) {
      totals.set(item.currency, (totals.get(item.currency) || 0) + Number(item.penalty_amount));
    }
    return totals;
  }, new Map());
  const totalIssuePenalty = [...issuePenaltyTotals]
    .map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`)
    .join(' · ') || '0.00';
  const totalMonthlyFees = Object.entries(issueWorkspace?.monthly_fee_totals || {})
    .map(([currency, amount]) => `${currency} ${Number(amount).toFixed(2)}`)
    .join(' · ') || '0.00';
  const selectedIssueTerminal = issueWorkspace?.terminals?.find((terminal) => terminal.terminal_id === newAtmIssue.terminal_id);
  const selectedIssueSla = issueWorkspace?.sla_settings?.find((setting) => (
    setting.zone === selectedIssueTerminal?.zone && setting.severity === newAtmIssue.severity
  ));
  const canRegisterIssue = Boolean(
    selectedIssueTerminal?.zone &&
    selectedIssueSla?.response_target_hours &&
    selectedIssueSla?.resolution_target_hours &&
    issueWorkspace?.issue_types?.some((type) => type.is_active)
  );
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
              <p className="text-xs font-bold text-slate-400 uppercase">Disputed Visits</p>
              <h3 className="text-2xl font-black text-red-600 mt-1">{analytics.disputed || 0}</h3>
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
                { id: 'issues', label: 'Daily Issue Tracking', icon: AlertTriangle },
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
                    : adminSection === 'issues' ? 'Daily Issue Tracking'
                    : adminSection === 'branches' ? 'Branch & Terminal Registration'
                      : adminSection === 'users' ? 'User Accounts'
                        : 'Registered Terminals'}
                </h2>
                {adminSection === 'schedules' && <button
                  type="button"
                  onClick={() => setShowScheduleImport((visible) => !visible)}
                  aria-expanded={showScheduleImport}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  {showScheduleImport ? 'Close Excel Import' : 'Import Excel Schedule'}
                </button>}
              </div>

              {adminSection === 'issues' && (
                <section className="space-y-6">
                  <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Vendor daily issue tracking</h3>
                      <p className="mt-1 max-w-3xl text-sm text-slate-600">
                        Track ATM issues, severity, business-hour response and resolution SLAs, terminal zones, and the Moti monthly performance penalty.
                      </p>
                    </div>
                    <label className="text-xs font-bold uppercase text-slate-600">
                      Performance month
                      <input
                        type="month"
                        value={issueMonth}
                        onChange={(e) => setIssueMonth(e.target.value)}
                        className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case"
                      />
                    </label>
                  </div>

                  {issueError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{issueError}</p>}
                  {issueMessage && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{issueMessage}</p>}
                  {issueLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading daily issue performance…</div>
                  ) : issueWorkspace && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-xs font-bold uppercase text-slate-400">Issues reported</p>
                          <p className="mt-1 text-2xl font-black text-slate-800">{totalLoggedIssues}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-xs font-bold uppercase text-slate-400">Past resolution SLA</p>
                          <p className="mt-1 text-2xl font-black text-red-600">{totalBreachedIssues}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-xs font-bold uppercase text-slate-400">Resolved within SLA</p>
                          <p className="mt-1 text-2xl font-black text-emerald-600">{totalLoggedIssues - totalBreachedIssues}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-xs font-bold uppercase text-slate-400">Monthly Moti fee</p>
                          <p className="mt-1 text-2xl font-black text-slate-800">{totalMonthlyFees}</p>
                          <p className="text-xs text-slate-500">Sum of entered active-terminal fees</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-xs font-bold uppercase text-slate-400">Penalty estimate · max 3%</p>
                          <p className="mt-1 text-2xl font-black text-red-600">{totalIssuePenalty}</p>
                          <p className="text-xs text-slate-500">Resolution breaches: {issueWorkspace.resolution_breach_percent}%</p>
                        </div>
                      </div>
                      {issueWorkspace.missing_fee_count > 0 && (
                        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          Monthly fee is not entered for {issueWorkspace.missing_fee_count} active terminal{issueWorkspace.missing_fee_count === 1 ? '' : 's'}; the penalty estimate excludes those fees.
                        </p>
                      )}

                      <div className="grid gap-6 xl:grid-cols-2">
                        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div>
                            <h3 className="text-base font-bold text-slate-800">Issue categories</h3>
                            <p className="mt-1 text-xs text-slate-500">Categories describe the fault; Critical, Major, and Minor select the corresponding response and resolution targets.</p>
                          </div>
                          <form onSubmit={handleCreateIssueType} className="flex flex-wrap gap-3">
                            <input value={newIssueType.name} onChange={(e) => setNewIssueType({ name: e.target.value })} maxLength={120} placeholder="e.g. Cash dispenser fault" aria-label="New issue category" className="min-w-52 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                            <button type="submit" disabled={issueSaving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">Add category</button>
                          </form>
                          <div className="space-y-3 border-t border-slate-100 pt-4">
                            {(issueWorkspace.issue_types || []).length === 0 && <p className="text-sm text-slate-500">Add an issue category before logging an issue.</p>}
                            {(issueWorkspace.issue_types || []).map((type) => {
                              const draft = issueTypeDrafts[type.id] || {};
                              return (
                                <div key={type.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-3">
                                  <input aria-label={`${type.name} category name`} value={draft.name || ''} onChange={(e) => setIssueTypeDrafts({ ...issueTypeDrafts, [type.id]: { ...draft, name: e.target.value } })} className="min-w-40 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                                  <label className="flex items-center gap-1 text-xs text-slate-500">
                                    <input type="checkbox" checked={Boolean(draft.is_active)} onChange={(e) => setIssueTypeDrafts({ ...issueTypeDrafts, [type.id]: { ...draft, is_active: e.target.checked } })} />
                                    Active
                                  </label>
                                  <button type="button" disabled={issueSaving} onClick={() => handleUpdateIssueType(type.id)} className="rounded bg-slate-100 px-2 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60">Save</button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div>
                            <h3 className="text-base font-bold text-slate-800">Terminal zones</h3>
                            <p className="mt-1 text-xs text-slate-500">Assign each active ATM. Zone 1 is the city zone and can have shorter SLA targets.</p>
                          </div>
                          <div className="max-h-80 space-y-2 overflow-y-auto">
                            {(issueWorkspace.terminals || []).map((terminal) => (
                              <label key={terminal.terminal_id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                <span><strong>{terminal.terminal_id}</strong><span className="block text-xs text-slate-500">{terminal.branch_name}</span></span>
                                <select value={terminal.zone || ''} onChange={(e) => handleUpdateTerminalZone(terminal.terminal_id, e.target.value)} disabled={issueSaving} aria-label={`${terminal.terminal_id} zone`} className="rounded border border-slate-300 px-2 py-1.5">
                                  <option value="">Select zone</option>
                                  <option value="ZONE_1">Zone 1</option>
                                  <option value="ZONE_2">Zone 2</option>
                                </select>
                              </label>
                            ))}
                            {(issueWorkspace.terminals || []).length === 0 && <p className="text-sm text-slate-500">No active ATM terminals are registered.</p>}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-6 xl:grid-cols-2">
                        <form onSubmit={handleSaveSlaSettings} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div>
                            <h3 className="text-base font-bold text-slate-800">Response and resolution SLAs</h3>
                            <p className="mt-1 text-xs text-slate-500">Enter hours (fractions are allowed and counted to the nearest minute). Resolution time determines monthly performance; response time is tracked separately. Zone 1 must be shorter than Zone 2, and Critical shorter than Major, then Minor. Targets are snapshotted on each new issue.</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="text-xs uppercase text-slate-500">
                                <tr><th className="p-2">Zone / severity</th><th className="p-2">Response hours</th><th className="p-2">Resolution hours</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(issueWorkspace.sla_settings || []).map((setting) => {
                                  const key = `${setting.zone}:${setting.severity}`;
                                  const draft = slaDrafts[key] || {};
                                  return (
                                    <tr key={key}>
                                      <th className="p-2 text-left font-semibold">{setting.zone.replace('_', ' ')} · {setting.severity}</th>
                                      <td className="p-2"><input aria-label={`${key} response target hours`} type="number" min="0.0167" max="8760" step="0.0001" value={draft.response_target_hours || ''} onChange={(e) => setSlaDrafts({ ...slaDrafts, [key]: { ...draft, response_target_hours: e.target.value } })} className="w-28 rounded border border-slate-300 px-2 py-1.5" required /></td>
                                      <td className="p-2"><input aria-label={`${key} resolution target hours`} type="number" min="0.0167" max="8760" step="0.0001" value={draft.resolution_target_hours || ''} onChange={(e) => setSlaDrafts({ ...slaDrafts, [key]: { ...draft, resolution_target_hours: e.target.value } })} className="w-28 rounded border border-slate-300 px-2 py-1.5" required /></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <button type="submit" disabled={issueSaving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">Save SLA targets</button>
                        </form>

                        {issuePolicyDraft && (
                          <form onSubmit={handleSaveIssuePolicy} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div>
                              <h3 className="text-base font-bold text-slate-800">Business hours</h3>
                              <p className="mt-1 text-xs text-slate-500">Clock: Addis Ababa time. Only resolution time determines monthly performance. Per terminal, penalty = that terminal’s monthly fee × 3% × its share of issues resolved after their deadlines; cap 3%.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { day: 1, label: 'Mon' }, { day: 2, label: 'Tue' }, { day: 3, label: 'Wed' },
                                { day: 4, label: 'Thu' }, { day: 5, label: 'Fri' }, { day: 6, label: 'Sat' }, { day: 7, label: 'Sun' },
                              ].map(({ day, label }) => (
                                <label key={day} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs">
                                  <input type="checkbox" checked={issuePolicyDraft.business_days.includes(day)} onChange={(e) => setIssuePolicyDraft({
                                    ...issuePolicyDraft,
                                    business_days: e.target.checked
                                      ? [...issuePolicyDraft.business_days, day].sort()
                                      : issuePolicyDraft.business_days.filter((current) => current !== day),
                                  })} />
                                  {label}
                                </label>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <label className="text-xs font-bold text-slate-600">Business start
                                <input type="time" value={issuePolicyDraft.business_start} onChange={(e) => setIssuePolicyDraft({ ...issuePolicyDraft, business_start: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal" required />
                              </label>
                              <label className="text-xs font-bold text-slate-600">Business end
                                <input type="time" value={issuePolicyDraft.business_end} onChange={(e) => setIssuePolicyDraft({ ...issuePolicyDraft, business_end: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal" required />
                              </label>
                            </div>
                            <button type="submit" disabled={issueSaving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">Save business hours</button>
                          </form>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800">Register daily ATM issue</h3>
                        <p className="mt-1 text-xs text-slate-500">Response and resolution deadlines use the selected terminal zone, severity, and configured business hours. SLA targets are snapshotted at registration.</p>
                        <form onSubmit={handleCreateAtmIssue} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                          <label className="text-xs font-bold uppercase text-slate-600">ATM terminal
                            <select value={newAtmIssue.terminal_id} onChange={(e) => setNewAtmIssue({ ...newAtmIssue, terminal_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" required>
                              <option value="">Select terminal</option>
                              {(issueWorkspace.terminals || []).filter((terminal) => terminal.is_active).map((terminal) => <option key={terminal.terminal_id} value={terminal.terminal_id}>{terminal.terminal_id} — {terminal.branch_name} · {terminal.zone ? terminal.zone.replace('_', ' ') : 'Zone not set'}</option>)}
                            </select>
                          </label>
                          <label className="text-xs font-bold uppercase text-slate-600">Issue type
                            <select value={newAtmIssue.issue_type_id} onChange={(e) => setNewAtmIssue({ ...newAtmIssue, issue_type_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" required>
                              <option value="">Select issue</option>
                              {(issueWorkspace.issue_types || []).filter((type) => type.is_active).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                            </select>
                          </label>
                          <label className="text-xs font-bold uppercase text-slate-600">Severity
                            <select value={newAtmIssue.severity} onChange={(e) => setNewAtmIssue({ ...newAtmIssue, severity: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" required>
                              <option value="CRITICAL">Critical</option>
                              <option value="MAJOR">Major</option>
                              <option value="MINOR">Minor</option>
                            </select>
                          </label>
                          <label className="text-xs font-bold uppercase text-slate-600">Reported date/time
                            <input type="datetime-local" value={newAtmIssue.reported_at} onChange={(e) => setNewAtmIssue({ ...newAtmIssue, reported_at: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" required />
                          </label>
                          <label className="text-xs font-bold uppercase text-slate-600 md:col-span-2">Issue description
                            <input value={newAtmIssue.description} onChange={(e) => setNewAtmIssue({ ...newAtmIssue, description: e.target.value })} maxLength={5000} placeholder="Describe the ATM fault or dispenser issue" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" required />
                          </label>
                          <button type="submit" disabled={issueSaving || !canRegisterIssue} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">Register issue</button>
                        </form>
                        {!canRegisterIssue && (
                          <p className="mt-3 text-xs text-amber-700">Assign a zone, configure this zone/severity’s SLA targets, and add an active issue category before registering.</p>
                        )}
                      </div>

                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-5 py-4">
                          <h3 className="text-base font-bold text-slate-800">Monthly per-terminal performance — {issueMonth}</h3>
                          <p className="mt-1 text-xs text-slate-500">Each terminal is scored separately: penalty = its monthly fee × 3% × its share of issues that miss resolution SLA. Open issues count as a breach after their deadline. Response SLA breaches are tracked but do not affect the penalty.</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                              <tr><th className="p-3">Terminal / Branch</th><th className="p-3">Zone</th><th className="p-3">Issues</th><th className="p-3">Past resolution SLA</th><th className="p-3">Resolution breach %</th><th className="p-3">Recurring monthly fee</th><th className="p-3">Penalty</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {issueMetrics.map((metric) => {
                                const feeDraft = monthlyFeeDrafts[metric.terminal_id] || { monthly_fee: '', currency: 'ETB' };
                                return (
                                  <tr key={metric.terminal_id}>
                                    <td className="p-3"><strong>{metric.terminal_id}</strong><span className="block text-xs text-slate-500">{metric.branch_name}</span></td>
                                    <td className="p-3">{metric.zone ? metric.zone.replace('_', ' ') : 'Not set'}</td>
                                    <td className="p-3">{metric.issue_count}</td>
                                    <td className="p-3 text-red-700">{metric.resolution_breached_count}</td>
                                    <td className="p-3">{metric.resolution_breach_percent === null ? '—' : `${metric.resolution_breach_percent}%`}</td>
                                    <td className="min-w-52 p-3">
                                      <div className="flex gap-1">
                                        <input aria-label={`${metric.terminal_id} recurring monthly vendor fee`} type="number" min="0" step="0.01" value={feeDraft.monthly_fee} onChange={(e) => setMonthlyFeeDrafts({ ...monthlyFeeDrafts, [metric.terminal_id]: { ...feeDraft, monthly_fee: e.target.value } })} placeholder="Fee" className="w-28 rounded border border-slate-300 px-2 py-1" />
                                        <input aria-label={`${metric.terminal_id} fee currency`} value={feeDraft.currency} onChange={(e) => setMonthlyFeeDrafts({ ...monthlyFeeDrafts, [metric.terminal_id]: { ...feeDraft, currency: e.target.value.toUpperCase() } })} maxLength={3} className="w-16 rounded border border-slate-300 px-2 py-1 uppercase" />
                                        <button type="button" disabled={issueSaving || feeDraft.monthly_fee === ''} onClick={() => handleSaveMonthlyFee(metric.terminal_id)} className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">Save</button>
                                      </div>
                                      <span className="mt-1 block text-[10px] text-slate-500">Set once; used for every month</span>
                                    </td>
                                    <td className="p-3 font-semibold text-red-700">{metric.issue_count && metric.penalty_amount !== null ? `${metric.currency} ${Number(metric.penalty_amount).toFixed(2)}` : '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {issueMetrics.length === 0 && <p className="p-5 text-sm text-slate-500">No active ATM terminals are registered.</p>}
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-5 py-4">
                          <h3 className="text-base font-bold text-slate-800">Issue log — {issueMonth}</h3>
                          <p className="mt-1 text-xs text-slate-500">Edit issue details, record actual response/resolution times, or remove incorrect/duplicate records. Changing terminal, severity, or report time recalculates the SLA deadline.</p>
                        </div>
                        <div className="divide-y divide-slate-200">
                          {(issueWorkspace.issues || []).map((issue) => {
                            const draft = issueDrafts[issue.id] || {};
                            const responseBreach = issue.response_breached;
                            const resolutionBreach = issue.resolution_breached;
                            const state = issue.resolved_at ? 'Resolved' : issue.vendor_response_at ? 'Responded' : 'Open';
                            return (
                              <article key={issue.id} className="space-y-3 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <h4 className="font-bold text-slate-800">{issue.terminal_id} — {issue.issue_type_name} · {issue.severity}</h4>
                                    <p className="text-xs text-slate-500">{issue.branch_name} · {issue.zone ? issue.zone.replace('_', ' ') : 'Zone not set'} · Reported {formatLocalDateTime(issue.reported_at)} · {state}</p>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{issue.description}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    <span className={`rounded-full px-2 py-1 ${responseBreach ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>Respond within {issue.response_target_hours}h · due {formatLocalDateTime(issue.response_due_at)}{responseBreach ? ' — breached' : ''}</span>
                                    <span className={`rounded-full px-2 py-1 ${resolutionBreach ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>Resolve within {issue.resolution_target_hours}h · due {formatLocalDateTime(issue.resolution_due_at)}{resolutionBreach ? ' — breached' : ''}</span>
                                  </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                  <label className="text-xs font-bold uppercase text-slate-500">ATM terminal
                                    <select value={draft.terminal_id || ''} onChange={(e) => setIssueDrafts({ ...issueDrafts, [issue.id]: { ...draft, terminal_id: e.target.value } })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" required>
                                      {(issueWorkspace.terminals || [])
                                        .filter((terminal) => terminal.is_active || terminal.terminal_id === draft.terminal_id)
                                        .map((terminal) => (
                                          <option key={terminal.terminal_id} value={terminal.terminal_id}>
                                            {terminal.terminal_id} — {terminal.branch_name}{terminal.is_active ? '' : ' (inactive)'}
                                          </option>
                                        ))}
                                    </select>
                                  </label>
                                  <label className="text-xs font-bold uppercase text-slate-500">Issue category
                                    <select value={draft.issue_type_id || ''} onChange={(e) => setIssueDrafts({ ...issueDrafts, [issue.id]: { ...draft, issue_type_id: e.target.value } })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" required>
                                      {(issueWorkspace.issue_types || [])
                                        .filter((type) => type.is_active || String(type.id) === draft.issue_type_id)
                                        .map((type) => <option key={type.id} value={type.id}>{type.name}{type.is_active ? '' : ' (inactive)'}</option>)}
                                    </select>
                                  </label>
                                  <label className="text-xs font-bold uppercase text-slate-500">Severity
                                    <select value={draft.severity || ''} onChange={(e) => setIssueDrafts({ ...issueDrafts, [issue.id]: { ...draft, severity: e.target.value } })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" required>
                                      <option value="CRITICAL">Critical</option>
                                      <option value="MAJOR">Major</option>
                                      <option value="MINOR">Minor</option>
                                    </select>
                                  </label>
                                  <label className="text-xs font-bold uppercase text-slate-500">Reported date/time
                                    <input type="datetime-local" value={draft.reported_at || ''} onChange={(e) => setIssueDrafts({ ...issueDrafts, [issue.id]: { ...draft, reported_at: e.target.value } })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" required />
                                  </label>
                                  <label className="text-xs font-bold uppercase text-slate-500 sm:col-span-2">Issue description
                                    <textarea value={draft.description || ''} onChange={(e) => setIssueDrafts({ ...issueDrafts, [issue.id]: { ...draft, description: e.target.value } })} maxLength={5000} rows="2" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" required />
                                  </label>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_2fr_auto_auto]">
                                  <label className="text-xs font-bold uppercase text-slate-500">Vendor responded at
                                    <input type="datetime-local" value={draft.vendor_response_at || ''} onChange={(e) => setIssueDrafts({ ...issueDrafts, [issue.id]: { ...draft, vendor_response_at: e.target.value } })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" />
                                  </label>
                                  <label className="text-xs font-bold uppercase text-slate-500">Issue resolved at
                                    <input type="datetime-local" value={draft.resolved_at || ''} onChange={(e) => setIssueDrafts({ ...issueDrafts, [issue.id]: { ...draft, resolved_at: e.target.value } })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" />
                                  </label>
                                  <label className="text-xs font-bold uppercase text-slate-500">Resolution notes
                                    <input value={draft.resolution_notes || ''} onChange={(e) => setIssueDrafts({ ...issueDrafts, [issue.id]: { ...draft, resolution_notes: e.target.value } })} maxLength={5000} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case" />
                                  </label>
                                  <button type="button" disabled={issueSaving} onClick={() => handleUpdateAtmIssue(issue.id)} className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">Save update</button>
                                  <button type="button" disabled={issueSaving} onClick={() => handleDeleteAtmIssue(issue)} className="self-end rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Delete issue</button>
                                </div>
                              </article>
                            );
                          })}
                          {(issueWorkspace.issues || []).length === 0 && <p className="p-5 text-sm text-slate-500">No ATM issues were reported during this month.</p>}
                        </div>
                      </div>
                    </>
                  )}
                </section>
              )}

              {showScheduleImport && (
                <div id="excel-schedule-import" className="scroll-mt-24 rounded-xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Upload PM Schedule from Excel</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Select an .xlsx workbook to import schedules. The registered branch is determined by terminal ID; any branch name in the workbook is ignored.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Required columns: Terminal ID and Date From (or Scheduled Date). Branch Name is optional. Excel dates or YYYY-MM-DD dates are accepted.</p>
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
              <p className="mb-4 text-sm text-slate-500">Enter the ATM model and manufacturer serial number. To update a registered ATM, submit its existing branch and terminal ID with the corrected details.</p>
              <form onSubmit={handleRegisterBranchAndAtm} className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
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
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">ATM Model</label>
                  <input
                    type="text"
                    value={atmModel}
                    onChange={(e) => setAtmModel(e.target.value)}
                    placeholder="e.g. NCR SelfServ 84"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">ATM Serial Number</label>
                  <input
                    type="text"
                    value={atmSerialNumber}
                    onChange={(e) => setAtmSerialNumber(e.target.value)}
                    placeholder="Manufacturer serial number"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <button type="submit" disabled={registeringTerminal} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait text-white font-semibold py-2 px-4 rounded-lg text-sm transition">
                  {registeringTerminal ? 'Registering…' : 'Save Branch & Terminal'}
                </button>
                {(registrationMessage || registrationError) && (
                  <p role={registrationError ? 'alert' : 'status'} className={`md:col-span-3 xl:col-span-6 text-sm ${registrationError ? 'text-red-700' : 'text-emerald-700'}`}>
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
              <form onSubmit={handleCreateSchedule} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
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
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Date From</label>
                  <input
                    type="date"
                    value={newDateFrom}
                    onChange={(e) => setNewDateFrom(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Date To</label>
                  <input
                    type="date"
                    value={newDateTo}
                    onChange={(e) => setNewDateTo(e.target.value)}
                    min={newDateFrom || undefined}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-4">
                  <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-4 rounded-lg text-sm transition">
                    Dispatch Schedule to Moti
                  </button>
                </div>
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
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <th className="p-3">Terminal ID</th>
                    <th className="p-3">Branch Name</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">Serial Number</th>
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
                      <td className="p-3 font-mono text-slate-600">{atm.serial_number || 'Not registered'}</td>
                      <td className="p-3 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setAtmEditError('');
                            setEditingAtm({
                              id: atm.id,
                              original_terminal_id: atm.terminal_id,
                              terminal_id: atm.terminal_id,
                              model: atm.model || '',
                              serial_number: atm.serial_number || '',
                            });
                          }}
                          className="mr-3 inline-flex items-center gap-1 rounded px-2 py-1 text-indigo-700 hover:bg-indigo-50"
                          title="Edit terminal"
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
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
            </div>
            )}

            {adminSection === 'terminals' && editingAtm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                <form onSubmit={handleUpdateAtm} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Edit Registered ATM Terminal</h3>
                    <button
                      type="button"
                      onClick={() => setEditingAtm(null)}
                      aria-label="Close terminal editor"
                      className="text-slate-500 hover:text-slate-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600">
                    Branch: {atms.find((atm) => atm.id === editingAtm.id)?.branch_name || 'Unknown'}
                  </p>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Terminal ID</label>
                    <input
                      type="text"
                      maxLength={50}
                      value={editingAtm.terminal_id}
                      onChange={(e) => setEditingAtm({ ...editingAtm, terminal_id: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-600">ATM Model</label>
                    <input
                      type="text"
                      maxLength={100}
                      value={editingAtm.model}
                      onChange={(e) => setEditingAtm({ ...editingAtm, model: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Serial Number</label>
                    <input
                      type="text"
                      maxLength={100}
                      value={editingAtm.serial_number}
                      onChange={(e) => setEditingAtm({ ...editingAtm, serial_number: e.target.value })}
                      placeholder="Optional"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">Serial number is optional and is not required for Moti to submit PM.</p>
                  </div>
                  {atmEditError && <p role="alert" className="text-sm text-red-700">{atmEditError}</p>}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingAtm(null)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingAtm}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {savingAtm ? 'Saving…' : 'Save Terminal'}
                    </button>
                  </div>
                </form>
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
                            <td className="p-4 text-slate-600">{formatScheduleRange(visit)}</td>
                            <td className="p-4 font-medium text-slate-600">{visit.vendor_name}</td>
                            <td className="p-4">{getStatusBadge(visit.status)}</td>
                            <td className="p-4">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                {visit.status === 'SCHEDULED' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setScheduleError('');
                                        setEditingSchedule({
                                          id: visit.id,
                                          status: visit.status,
                                          terminal_id: visit.terminal_id,
                                          scheduled_date: String(visit.scheduled_date || '').slice(0, 10),
                                          scheduled_end_date: String(visit.scheduled_end_date || visit.scheduled_date || '').slice(0, 10)
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
                                  </>
                                )}
                                {visit.status !== 'SCHEDULED' && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveModalVisit(visit)}
                                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
                                  >
                                    View Details
                                  </button>
                                )}
                                {visit.status === 'BRANCH_CONFIRMED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadPmReport(visit)}
                                    disabled={downloadingReportId === visit.id}
                                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 disabled:cursor-wait disabled:opacity-60"
                                  >
                                    <Download className="h-4 w-4" />
                                    {downloadingReportId === visit.id ? 'Generating…' : 'PDF Report'}
                                  </button>
                                )}
                              </div>
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
                    <td className="p-4 text-slate-600">{formatScheduleRange(visit)}</td>
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
                                status: visit.status,
                                terminal_id: visit.terminal_id,
                                scheduled_date: String(visit.scheduled_date || '').slice(0, 10),
                                          scheduled_end_date: String(visit.scheduled_end_date || visit.scheduled_date || '').slice(0, 10)
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
                disabled={['BRANCH_CONFIRMED', 'BRANCH_DISPUTED'].includes(editingSchedule.status)}
                required
              >
                {atms.filter((atm) => atm.is_active !== false).map((atm) => (
                  <option key={atm.terminal_id} value={atm.terminal_id}>{atm.terminal_id} — {atm.branch_name}</option>
                ))}
              </select>
              {editingSchedule.status !== 'SCHEDULED' && (
                <p className="mt-1 text-xs text-slate-500">Confirmed and disputed visits are locked and cannot be edited.</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Date From</label>
                <input
                  type="date"
                  value={editingSchedule.scheduled_date}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, scheduled_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Date To</label>
                <input
                  type="date"
                  value={editingSchedule.scheduled_end_date || editingSchedule.scheduled_date}
                  min={editingSchedule.scheduled_date || undefined}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, scheduled_end_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
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
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Moti Visit Date</label>
                    <input
                      type="date"
                      value={vendorVisitDate}
                      onChange={(e) => setVendorVisitDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Time12HourInput label="Work Start Time" value={workStartTime} onChange={setWorkStartTime} />
                    <Time12HourInput label="Work Finished Time" value={workFinishedTime} onChange={setWorkFinishedTime} />
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700">ATM Maintenance Checklist</h4>
                    <p className="text-xs text-slate-500">Moti engineer: verify and check every cleaning task, choose a condition for each status, and record all site readings before submitting.</p>
                    {PM_CHECKLIST.map((section) => (
                      <section key={section.key} className="rounded-lg border border-slate-200 p-4">
                        <h5 className="mb-3 text-sm font-bold text-slate-800">{section.title}</h5>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {section.fields.map((field) => {
                            const value = vendorChecklist[section.key][field.key];
                            if (field.type === 'task') {
                              return (
                                <label key={field.key} className="flex items-start gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={(e) => setVendorChecklist((previous) => ({
                                      ...previous,
                                      [section.key]: { ...previous[section.key], [field.key]: e.target.checked },
                                    }))}
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                                    required
                                  />
                                  <span>{field.label}</span>
                                </label>
                              );
                            }
                            if (field.type === 'checkbox_choice') {
                              return (
                                <fieldset key={field.key} className="min-w-0">
                                  <legend className="mb-1 text-xs font-semibold text-slate-600">{field.label}</legend>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                                    {field.options.map((option) => {
                                      const optionValue = option.toUpperCase().replaceAll(' ', '_');
                                      return (
                                        <label key={option} className="flex items-center gap-1 text-xs text-slate-700">
                                          <input
                                            type="checkbox"
                                            checked={value === optionValue}
                                            onChange={(e) => setVendorChecklist((previous) => ({
                                              ...previous,
                                              [section.key]: {
                                                ...previous[section.key],
                                                [field.key]: e.target.checked ? optionValue : '',
                                              },
                                            }))}
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                          />
                                          {option}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </fieldset>
                              );
                            }
                            if (field.type === 'choice') {
                              return (
                                <fieldset key={field.key} className="min-w-0">
                                  <legend className="mb-1 text-xs font-semibold text-slate-600">{field.label}</legend>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                                    {field.options.map((option, index) => (
                                      <label key={option} className="flex items-center gap-1 text-xs text-slate-700">
                                        <input
                                          type="radio"
                                          name={`${section.key}-${field.key}`}
                                          value={option.toUpperCase().replaceAll(' ', '_')}
                                          checked={value === option.toUpperCase().replaceAll(' ', '_')}
                                          onChange={(e) => setVendorChecklist((previous) => ({
                                            ...previous,
                                            [section.key]: { ...previous[section.key], [field.key]: e.target.value },
                                          }))}
                                          className="h-4 w-4 border-slate-300 text-indigo-600"
                                          required={index === 0 || !value}
                                        />
                                        {option}
                                      </label>
                                    ))}
                                  </div>
                                </fieldset>
                              );
                            }
                            return (
                              <label key={field.key} className="block text-xs font-semibold text-slate-600">
                                {field.label}
                                <input
                                  type={field.type === 'number' ? 'number' : 'text'}
                                  min={field.type === 'number' ? '0' : undefined}
                                  max={field.type === 'number' ? '100' : undefined}
                                  step={field.type === 'number' ? '0.1' : undefined}
                                  value={value}
                                  onChange={(e) => setVendorChecklist((previous) => ({
                                    ...previous,
                                    [section.key]: { ...previous[section.key], [field.key]: e.target.value },
                                  }))}
                                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                                  required
                                />
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    ))}
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
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Submit Verified PM Completion for Branch Verification
                  </button>
                </form>
              )}

              {/* Branch Verification Form */}
              {role === 'BRANCH' && activeModalVisit.status === 'VENDOR_COMPLETED' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p><strong>ATM Model:</strong> {activeModalVisit.model || 'Not registered'}</p>
                    <p><strong>ATM Serial Number:</strong> {activeModalVisit.serial_number || 'Not registered'}</p>
                    <p><strong>Technician:</strong> {activeModalVisit.vendor_technician}</p>
                    <p><strong>Moti Visit Date:</strong> {formatVisitDate(activeModalVisit)}</p>
                    <p><strong>Work Start:</strong> {formatTime12Hour(activeModalVisit.work_start_time)}</p>
                    <p><strong>Work Finished:</strong> {formatTime12Hour(activeModalVisit.work_finished_time)}</p>
                    <p><strong>Vendor Notes:</strong> {activeModalVisit.vendor_notes}</p>
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-bold uppercase text-slate-500">Moti Engineer Inspection</h4>
                    <ChecklistReview checklist={activeModalVisit.vendor_checklist} />
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
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p><strong>ATM Model:</strong> {activeModalVisit.model || 'Not registered'}</p>
                    <p><strong>ATM Serial Number:</strong> {activeModalVisit.serial_number || 'Not registered'}</p>
                    <p><strong>Moti Visit Date:</strong> {formatVisitDate(activeModalVisit)}</p>
                    <p><strong>Work Start:</strong> {formatTime12Hour(activeModalVisit.work_start_time)}</p>
                    <p><strong>Work Finished:</strong> {formatTime12Hour(activeModalVisit.work_finished_time)}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase text-slate-400">Moti Engineer Inspection</p>
                    <ChecklistReview checklist={activeModalVisit.vendor_checklist} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Schedule Status</p>
                    <div className="mt-1">{getStatusBadge(activeModalVisit.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Scheduled Date</p>
                    <p className="text-slate-700">{formatScheduleRange(activeModalVisit)}</p>
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
