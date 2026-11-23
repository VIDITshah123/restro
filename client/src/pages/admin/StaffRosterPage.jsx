import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Calendar, Clock, DollarSign, Plus, Edit2, Trash2,
  CheckCircle2, XCircle, AlertCircle, Download, Search, Phone, MapPin,
  CalendarDays, ChevronLeft, ChevronRight, Briefcase
} from 'lucide-react';
import * as XLSX from 'xlsx';
import AppDialog, { useDialog } from '../../components/AppDialog';

const ROLES = [
  'Head Chef', 'Assistant Chef', 'Line Cook', 'Waiter',
  'Captain / Head Waiter', 'Bartender', 'Cashier', 'Manager', 'Cleaning & Utility', 'Other'
];

const ATTENDANCE_STATUSES = [
  { key: 'present', label: 'Present', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { key: 'absent', label: 'Absent', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { key: 'half_day', label: 'Half Day', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { key: 'leave', label: 'Leave', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
];

const StaffRosterPage = () => {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'directory' | 'overtime' | 'payroll'
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Attendance state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({ total: 0, present: 0, absent: 0, half_day: 0, leave: 0, unmarked: 0 });
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Overtime state
  const [overtimeRecords, setOvertimeRecords] = useState([]);
  const [overtimeSummary, setOvertimeSummary] = useState({ totalHours: 0, totalCharges: 0, totalRecords: 0 });

  // Payroll summary state
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [payrollSummary, setPayrollSummary] = useState([]);
  const [payrollTotals, setPayrollTotals] = useState({});

  // Filter/Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modals
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [preselectedStaffIdForOt, setPreselectedStaffIdForOt] = useState('');

  // Staff Form state
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    role: 'Waiter',
    mobile_number: '',
    alt_number: '',
    address: '',
    salary_per_month: '',
    joined_date: new Date().toISOString().split('T')[0],
    is_active: 1
  });
  const [staffFormError, setStaffFormError] = useState('');
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  // Overtime Form state
  const [otFormData, setOtFormData] = useState({
    staff_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: 2,
    hourly_rate: 100,
    total_charges: '',
    reason: 'Evening rush / peak hours'
  });
  const [otFormError, setOtFormError] = useState('');
  const [isSubmittingOt, setIsSubmittingOt] = useState(false);

  const { showAlert, showConfirm, dialogState, closeDialog } = useDialog();

  // ── Fetch Staff List ────────────────────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff');
      setStaffList(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching staff list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch Daily Attendance ──────────────────────────────────────────────────
  const fetchAttendance = useCallback(async (date) => {
    try {
      const res = await api.get(`/staff/attendance/daily?date=${date}`);
      setAttendanceRecords(res.data?.data || []);
      setAttendanceSummary(res.data?.summary || {});
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  }, []);

  // ── Fetch Overtime ──────────────────────────────────────────────────────────
  const fetchOvertime = useCallback(async (month) => {
    try {
      const res = await api.get(`/staff/overtime?month=${month}`);
      setOvertimeRecords(res.data?.data || []);
      setOvertimeSummary(res.data?.summary || {});
    } catch (err) {
      console.error('Error fetching overtime:', err);
    }
  }, []);

  // ── Fetch Payroll Summary ───────────────────────────────────────────────────
  const fetchPayroll = useCallback(async (month) => {
    try {
      const res = await api.get(`/staff/roster/summary?month=${month}`);
      setPayrollSummary(res.data?.summary || []);
      setPayrollTotals(res.data?.grandTotals || {});
    } catch (err) {
      console.error('Error fetching payroll summary:', err);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance(selectedDate);
    } else if (activeTab === 'overtime') {
      fetchOvertime(selectedMonth);
    } else if (activeTab === 'payroll') {
      fetchPayroll(selectedMonth);
    }
  }, [activeTab, selectedDate, selectedMonth, fetchAttendance, fetchOvertime, fetchPayroll]);

  // ── Save Attendance Status ──────────────────────────────────────────────────
  const handleStatusChange = (staffId, newStatus) => {
    setAttendanceRecords(prev => prev.map(rec => {
      if (rec.staff_id === staffId) {
        return { ...rec, status: newStatus };
      }
      return rec;
    }));
  };

  const handleAttendanceNoteChange = (staffId, field, value) => {
    setAttendanceRecords(prev => prev.map(rec => {
      if (rec.staff_id === staffId) {
        return { ...rec, [field]: value };
      }
      return rec;
    }));
  };

  const saveAttendance = async () => {
    setIsSavingAttendance(true);
    try {
      const payload = {
        date: selectedDate,
        records: attendanceRecords.map(r => ({
          staff_id: r.staff_id,
          status: r.status === 'unmarked' ? 'present' : r.status,
          check_in: r.check_in || '',
          check_out: r.check_out || '',
          notes: r.notes || ''
        }))
      };
      await api.post('/staff/attendance/daily', payload);
      await showAlert(`Attendance saved for ${selectedDate}!`, { title: 'Success' });
      fetchAttendance(selectedDate);
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Failed to save attendance', { title: 'Error', danger: true });
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const markAllAs = (status) => {
    setAttendanceRecords(prev => prev.map(rec => ({ ...rec, status })));
  };

  // ── Staff Add / Edit ────────────────────────────────────────────────────────
  const openAddStaff = () => {
    setEditingStaff(null);
    setStaffFormData({
      name: '',
      role: 'Waiter',
      mobile_number: '',
      alt_number: '',
      address: '',
      salary_per_month: '',
      joined_date: new Date().toISOString().split('T')[0],
      is_active: 1
    });
    setStaffFormError('');
    setShowStaffModal(true);
  };

  const openEditStaff = (staff) => {
    setEditingStaff(staff);
    setStaffFormData({
      name: staff.name,
      role: staff.role || 'Waiter',
      mobile_number: staff.mobile_number || '',
      alt_number: staff.alt_number || '',
      address: staff.address || '',
      salary_per_month: staff.salary_per_month || '',
      joined_date: staff.joined_date || '',
      is_active: staff.is_active !== undefined ? staff.is_active : 1
    });
    setStaffFormError('');
    setShowStaffModal(true);
  };

  const handleStaffFormSubmit = async (e) => {
    e.preventDefault();
    setStaffFormError('');
    if (!staffFormData.name.trim()) {
      setStaffFormError('Staff name is required.');
      return;
    }
    if (!staffFormData.mobile_number.trim()) {
      setStaffFormError('Mobile number is required.');
      return;
    }

    setIsSubmittingStaff(true);
    try {
      if (editingStaff) {
        await api.put(`/staff/${editingStaff.id}`, staffFormData);
        await showAlert(`Staff "${staffFormData.name}" updated successfully.`, { title: 'Updated' });
      } else {
        await api.post('/staff', staffFormData);
        await showAlert(`Staff "${staffFormData.name}" added successfully.`, { title: 'Added' });
      }
      setShowStaffModal(false);
      fetchStaff();
      if (activeTab === 'attendance') fetchAttendance(selectedDate);
    } catch (err) {
      setStaffFormError(err.response?.data?.message || 'Operation failed.');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleDeleteStaff = async (staff) => {
    const confirmed = await showConfirm(
      `Delete staff member "${staff.name}"? This will also remove their attendance and overtime records.`,
      { title: 'Delete Staff', danger: true, confirmLabel: 'Yes, Delete' }
    );
    if (!confirmed) return;

    try {
      await api.delete(`/staff/${staff.id}`);
      await showAlert(`Staff member ${staff.name} deleted.`, { title: 'Deleted' });
      fetchStaff();
      if (activeTab === 'attendance') fetchAttendance(selectedDate);
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Failed to delete staff.', { title: 'Error', danger: true });
    }
  };

  // ── Overtime Add / Delete ───────────────────────────────────────────────────
  const openAddOvertime = (staffId = '') => {
    setPreselectedStaffIdForOt(staffId);
    setOtFormData({
      staff_id: staffId || (staffList[0]?.id || ''),
      date: selectedDate,
      hours: 2,
      hourly_rate: 100,
      total_charges: '',
      reason: 'Evening rush / peak hours'
    });
    setOtFormError('');
    setShowOvertimeModal(true);
  };

  const handleOtFormSubmit = async (e) => {
    e.preventDefault();
    setOtFormError('');
    if (!otFormData.staff_id) {
      setOtFormError('Please select a staff member.');
      return;
    }
    if (!otFormData.hours || parseFloat(otFormData.hours) <= 0) {
      setOtFormError('Please enter valid overtime hours.');
      return;
    }

    setIsSubmittingOt(true);
    try {
      await api.post('/staff/overtime', otFormData);
      await showAlert('Overtime record logged successfully.', { title: 'Overtime Added' });
      setShowOvertimeModal(false);
      fetchOvertime(selectedMonth);
      if (activeTab === 'payroll') fetchPayroll(selectedMonth);
    } catch (err) {
      setOtFormError(err.response?.data?.message || 'Failed to log overtime.');
    } finally {
      setIsSubmittingOt(false);
    }
  };

  const handleDeleteOvertime = async (record) => {
    const confirmed = await showConfirm(
      `Delete overtime of ${record.hours} hrs (₹${record.total_charges}) for ${record.staff_name}?`,
      { title: 'Delete Overtime', danger: true, confirmLabel: 'Delete' }
    );
    if (!confirmed) return;

    try {
      await api.delete(`/staff/overtime/${record.id}`);
      fetchOvertime(selectedMonth);
      if (activeTab === 'payroll') fetchPayroll(selectedMonth);
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Failed to delete overtime.', { title: 'Error', danger: true });
    }
  };

  // ── Excel Export ────────────────────────────────────────────────────────────
  const handleExportPayroll = () => {
    const rows = payrollSummary.map(row => ({
      'Staff Name': row.name,
      'Role': row.role,
      'Mobile Number': row.mobile_number,
      'Monthly Base Salary (₹)': row.salary_per_month,
      'Days in Month': row.days_in_month,
      'Present Days': row.present_days,
      'Half Days': row.half_days,
      'Absent Days': row.absent_days,
      'Leave Days': row.leave_days,
      'Effective Payable Days': row.payable_days,
      'Base Pay Earned (₹)': row.base_pay_earned,
      'Overtime Hours': row.overtime_hours,
      'Overtime Charges / Bonus (₹)': row.overtime_charges,
      'Total Net Payout (₹)': row.total_payable
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff_Payroll');
    XLSX.writeFile(wb, `Staff_Payroll_${selectedMonth}.xlsx`);
  };

  // Filtered staff list
  const filteredStaffList = useMemo(() => {
    return staffList.filter(s => {
      const matchesSearch = !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.mobile_number && s.mobile_number.includes(searchQuery)) ||
        (s.role && s.role.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = roleFilter === 'All' || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staffList, searchQuery, roleFilter]);

  return (
    <div className="p-6 md:p-8 min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* ── Top Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-between items-start mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <CalendarDays size={20} className="text-black" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
                Staff Roster & Payroll
              </h1>
              <p className="text-gray-500 text-xs uppercase tracking-widest mt-0.5">
                Attendance, Overtime Management & Monthly Payouts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openAddOvertime()}
            className="flex items-center gap-1.5 bg-[#141414] hover:bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            <Clock size={15} /> Log Overtime
          </button>
          <button
            onClick={openAddStaff}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            <UserPlus size={16} strokeWidth={2.5} /> Add Staff
          </button>
        </div>
      </motion.div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6 overflow-x-auto">
        {[
          { key: 'attendance', label: 'Daily Attendance', icon: Calendar },
          { key: 'directory', label: `Staff Directory (${staffList.length})`, icon: Users },
          { key: 'overtime', label: `Overtime & Charges`, icon: Clock },
          { key: 'payroll', label: 'Monthly Summary & Payouts', icon: DollarSign },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-[#121212] border border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: DAILY ATTENDANCE ── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Date Picker Bar & Summary Cards */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Roster Date:</label>
              <div className="flex items-center bg-[#181818] border border-white/10 rounded-xl px-3 py-1.5 gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm text-gray-200 outline-none font-bold cursor-pointer"
                />
              </div>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-xs font-bold text-amber-500 hover:underline cursor-pointer"
              >
                Today
              </button>
            </div>

            {/* Quick Bulk Marking */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 uppercase tracking-widest font-bold">Mark All:</span>
              <button
                onClick={() => markAllAs('present')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              >
                All Present
              </button>
              <button
                onClick={() => markAllAs('absent')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                All Absent
              </button>
              <button
                onClick={saveAttendance}
                disabled={isSavingAttendance}
                className="ml-2 flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                {isSavingAttendance ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total Active Staff', val: attendanceSummary.total || 0, color: 'text-gray-100', bg: 'bg-white/5 border-white/5' },
              { label: 'Present', val: attendanceSummary.present || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Absent', val: attendanceSummary.absent || 0, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
              { label: 'Half Day', val: attendanceSummary.half_day || 0, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'On Leave', val: attendanceSummary.leave || 0, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border rounded-2xl p-3.5 text-center`}>
                <p className={`text-2xl font-black font-mono ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Attendance Table */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-[#141414] text-[11px] text-gray-500 uppercase tracking-widest font-bold">
                    <th className="px-5 py-4">Staff Member</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Mobile</th>
                    <th className="px-5 py-4">Attendance Status</th>
                    <th className="px-5 py-4">Check-In / Out</th>
                    <th className="px-5 py-4">Notes</th>
                    <th className="px-5 py-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-12 text-center text-gray-600">
                        No active staff members found. Add staff members first!
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.map(rec => {
                      const curStatus = rec.status === 'unmarked' ? 'present' : rec.status;
                      return (
                        <tr key={rec.staff_id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-bold text-gray-100 text-sm block">{rec.name}</span>
                            <span className="text-[10px] text-amber-500/80 font-mono">₹{rec.salary_per_month}/mo</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-gray-300">
                              {rec.role || 'Staff'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-gray-400 font-mono">
                            {rec.mobile_number || '—'}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {ATTENDANCE_STATUSES.map(st => {
                                const isSelected = curStatus === st.key;
                                return (
                                  <button
                                    key={st.key}
                                    type="button"
                                    onClick={() => handleStatusChange(rec.staff_id, st.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                      isSelected
                                        ? `${st.color} shadow-sm font-black scale-105`
                                        : 'bg-white/5 border border-white/5 text-gray-500 hover:text-gray-300'
                                    }`}
                                  >
                                    {st.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                placeholder="09:00 AM"
                                value={rec.check_in || ''}
                                onChange={e => handleAttendanceNoteChange(rec.staff_id, 'check_in', e.target.value)}
                                className="w-20 bg-[#161616] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-gray-300 outline-none focus:border-amber-500/50"
                              />
                              <span className="text-gray-600">-</span>
                              <input
                                type="text"
                                placeholder="06:00 PM"
                                value={rec.check_out || ''}
                                onChange={e => handleAttendanceNoteChange(rec.staff_id, 'check_out', e.target.value)}
                                className="w-20 bg-[#161616] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-gray-300 outline-none focus:border-amber-500/50"
                              />
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <input
                              type="text"
                              placeholder="Optional remarks..."
                              value={rec.notes || ''}
                              onChange={e => handleAttendanceNoteChange(rec.staff_id, 'notes', e.target.value)}
                              className="w-36 bg-[#161616] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-gray-300 outline-none focus:border-amber-500/50"
                            />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => openAddOvertime(rec.staff_id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors cursor-pointer"
                            >
                              + Overtime
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: STAFF DIRECTORY ── */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md bg-[#0f0f0f] border border-white/10 rounded-xl px-3 py-2">
              <Search size={16} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search staff by name, phone or role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-gray-200 outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-[#0f0f0f] border border-white/10 text-gray-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500/50"
              >
                <option value="All">All Roles</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaffList.map(staff => (
              <motion.div
                key={staff.id}
                layout
                className="bg-[#0f0f0f] border border-white/5 hover:border-amber-500/20 rounded-2xl p-5 flex flex-col justify-between shadow-lg transition-all"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-100">{staff.name}</h3>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 uppercase tracking-wider mt-1">
                        {staff.role || 'Staff'}
                      </span>
                    </div>
                    <span className="font-mono font-black text-amber-500 text-base">
                      ₹{staff.salary_per_month}/mo
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-400 mt-4 border-t border-white/5 pt-3">
                    <p className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-500 shrink-0" />
                      <span>{staff.mobile_number}</span>
                      {staff.alt_number && (
                        <span className="text-gray-600">/ {staff.alt_number}</span>
                      )}
                    </p>
                    {staff.address && (
                      <p className="flex items-start gap-2">
                        <MapPin size={13} className="text-gray-500 shrink-0 mt-0.5" />
                        <span className="truncate">{staff.address}</span>
                      </p>
                    )}
                    {staff.joined_date && (
                      <p className="flex items-center gap-2 text-gray-500 text-[11px]">
                        <Briefcase size={12} className="shrink-0" />
                        <span>Joined: {staff.joined_date}</span>
                      </p>
                    )}
                  </div>

                  {/* Attendance & OT mini stats */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5 text-center text-xs">
                    <div className="bg-white/5 rounded-xl p-2">
                      <span className="block text-emerald-400 font-bold font-mono text-sm">{staff.total_present || 0}</span>
                      <span className="text-[10px] text-gray-500 uppercase">Days Present</span>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2">
                      <span className="block text-amber-400 font-bold font-mono text-sm">{staff.total_overtime_hours || 0}h (₹{staff.total_overtime_charges || 0})</span>
                      <span className="text-[10px] text-gray-500 uppercase">Overtime</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex gap-2 mt-5 pt-3 border-t border-white/5">
                  <button
                    onClick={() => openAddOvertime(staff.id)}
                    className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
                  >
                    + Overtime
                  </button>
                  <button
                    onClick={() => openEditStaff(staff)}
                    className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 border border-white/10 rounded-xl transition-colors cursor-pointer"
                    title="Edit Staff"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(staff)}
                    className="p-2 bg-red-500/5 hover:bg-red-500/10 text-red-400/70 hover:text-red-400 border border-red-500/10 rounded-xl transition-colors cursor-pointer"
                    title="Delete Staff"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}

            {filteredStaffList.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-600 bg-[#0f0f0f] border border-white/5 rounded-2xl">
                <Users size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No staff members found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: OVERTIME & CHARGES ── */}
      {activeTab === 'overtime' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-[#181818] border border-white/10 rounded-xl px-3 py-1.5 text-sm text-gray-200 outline-none font-bold"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-medium">Month Overtime Total</span>
                <span className="text-xl font-black text-amber-500 font-mono">
                  {overtimeSummary.totalHours || 0} hrs = ₹{overtimeSummary.totalCharges || 0}
                </span>
              </div>
              <button
                onClick={() => openAddOvertime()}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} /> Log Overtime
              </button>
            </div>
          </div>

          {/* Overtime Table */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-[#141414] text-[11px] text-gray-500 uppercase tracking-widest font-bold">
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Staff Member</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Overtime Hours</th>
                    <th className="px-5 py-4">Rate / Charges</th>
                    <th className="px-5 py-4">Reason / Notes</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {overtimeRecords.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-12 text-center text-gray-600">
                        No overtime records logged for {selectedMonth}.
                      </td>
                    </tr>
                  ) : (
                    overtimeRecords.map(rec => (
                      <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 font-mono text-gray-300 font-bold">{rec.date}</td>
                        <td className="px-5 py-4 font-bold text-gray-100">{rec.staff_name}</td>
                        <td className="px-5 py-4 text-gray-400">{rec.staff_role}</td>
                        <td className="px-5 py-4">
                          <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                            {rec.hours} hrs
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono font-black text-amber-500 text-sm">
                          ₹{rec.total_charges}
                          {rec.hourly_rate > 0 && (
                            <span className="text-[10px] text-gray-500 ml-1.5 font-normal">(@ ₹{rec.hourly_rate}/hr)</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-gray-400 italic">{rec.reason || '—'}</td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleDeleteOvertime(rec)}
                            className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: MONTHLY PAYROLL & SUMMARY ── */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Select Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-[#181818] border border-white/10 rounded-xl px-3 py-1.5 text-sm text-gray-200 outline-none font-bold cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPayroll}
                className="flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <Download size={14} /> Export to Excel
              </button>
            </div>
          </div>

          {/* Grand Totals Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Staff Count', val: payrollTotals.totalStaff || 0, color: 'text-gray-100', prefix: '' },
              { label: 'Total Base Salaries', val: `₹${(payrollTotals.totalBaseSalary || 0).toLocaleString()}`, color: 'text-gray-300', prefix: '' },
              { label: 'Total Overtime Paid', val: `₹${(payrollTotals.totalOvertimeCharges || 0).toLocaleString()}`, color: 'text-amber-400', prefix: '' },
              { label: 'Total Net Payout', val: `₹${(payrollTotals.totalPayable || 0).toLocaleString()}`, color: 'text-emerald-400', prefix: '' },
            ].map(item => (
              <div key={item.label} className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 text-center shadow-lg">
                <p className={`text-2xl font-black font-mono ${item.color}`}>{item.val}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 font-bold">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Payroll Table */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-[#141414] text-[11px] text-gray-500 uppercase tracking-widest font-bold">
                    <th className="px-5 py-4">Staff Member</th>
                    <th className="px-5 py-4">Monthly Base</th>
                    <th className="px-5 py-4">Present / Half / Absent</th>
                    <th className="px-5 py-4">Payable Days</th>
                    <th className="px-5 py-4">Base Pay Earned</th>
                    <th className="px-5 py-4">Overtime Extra</th>
                    <th className="px-5 py-4 text-right">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {payrollSummary.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-12 text-center text-gray-600">
                        No active staff members found for {selectedMonth}.
                      </td>
                    </tr>
                  ) : (
                    payrollSummary.map(row => (
                      <tr key={row.staff_id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-bold text-gray-100 text-sm block">{row.name}</span>
                          <span className="text-[10px] text-gray-500">{row.role} · {row.mobile_number}</span>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-gray-300">
                          ₹{row.salary_per_month}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-emerald-400 font-bold font-mono">{row.present_days}P</span>
                          <span className="text-gray-600 mx-1">/</span>
                          <span className="text-amber-400 font-bold font-mono">{row.half_days}H</span>
                          <span className="text-gray-600 mx-1">/</span>
                          <span className="text-red-400 font-bold font-mono">{row.absent_days}A</span>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-gray-200">
                          {row.payable_days} days
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-gray-200">
                          ₹{row.base_pay_earned}
                        </td>
                        <td className="px-5 py-4">
                          {row.overtime_charges > 0 ? (
                            <span className="font-mono font-bold text-amber-400">
                              +₹{row.overtime_charges} <span className="text-[10px] text-gray-500 font-normal">({row.overtime_hours}h)</span>
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-mono font-black text-amber-500 text-base">
                            ₹{row.total_payable}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: ADD / EDIT STAFF ── */}
      <AnimatePresence>
        {showStaffModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowStaffModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0f0f0f] border border-amber-500/20 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="font-serif font-black text-lg text-gray-100">
                  {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h3>
                <button onClick={() => setShowStaffModal(false)} className="text-gray-500 hover:text-gray-300">
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleStaffFormSubmit} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Full Name <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={staffFormData.name}
                    onChange={e => setStaffFormData({ ...staffFormData, name: e.target.value })}
                    className="w-full bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Role / Designation
                    </label>
                    <select
                      value={staffFormData.role}
                      onChange={e => setStaffFormData({ ...staffFormData, role: e.target.value })}
                      className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Monthly Salary (₹) <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 18000"
                      value={staffFormData.salary_per_month}
                      onChange={e => setStaffFormData({ ...staffFormData, salary_per_month: e.target.value })}
                      className="w-full bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 outline-none focus:border-amber-500/50 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Mobile Number <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={staffFormData.mobile_number}
                      onChange={e => setStaffFormData({ ...staffFormData, mobile_number: e.target.value })}
                      className="w-full bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Alternate Mobile
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9123456780"
                      value={staffFormData.alt_number}
                      onChange={e => setStaffFormData({ ...staffFormData, alt_number: e.target.value })}
                      className="w-full bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Residential Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter complete residential address..."
                    value={staffFormData.address}
                    onChange={e => setStaffFormData({ ...staffFormData, address: e.target.value })}
                    className="w-full bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Date Joined
                  </label>
                  <input
                    type="date"
                    value={staffFormData.joined_date}
                    onChange={e => setStaffFormData({ ...staffFormData, joined_date: e.target.value })}
                    className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                  />
                </div>

                {staffFormError && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" /> {staffFormError}
                  </p>
                )}

                <div className="flex gap-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowStaffModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-gray-200 font-bold text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStaff}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingStaff ? 'Saving...' : editingStaff ? 'Save Changes' : 'Add Staff'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: LOG OVERTIME ── */}
      <AnimatePresence>
        {showOvertimeModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowOvertimeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0f0f0f] border border-amber-500/20 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="font-serif font-black text-lg text-gray-100">
                  Log Overtime Hours & Charges
                </h3>
                <button onClick={() => setShowOvertimeModal(false)} className="text-gray-500 hover:text-gray-300">
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleOtFormSubmit} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Select Staff Member <span className="text-amber-500">*</span>
                  </label>
                  <select
                    value={otFormData.staff_id}
                    onChange={e => setOtFormData({ ...otFormData, staff_id: e.target.value })}
                    className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                  >
                    <option value="">-- Choose Staff --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Overtime Date
                  </label>
                  <input
                    type="date"
                    value={otFormData.date}
                    onChange={e => setOtFormData({ ...otFormData, date: e.target.value })}
                    className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Hours Worked <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      placeholder="e.g. 2.5"
                      value={otFormData.hours}
                      onChange={e => setOtFormData({ ...otFormData, hours: e.target.value })}
                      className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Hourly Rate (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={otFormData.hourly_rate}
                      onChange={e => setOtFormData({ ...otFormData, hourly_rate: e.target.value })}
                      className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Total Charges / Bonus (₹)
                    <span className="text-[10px] text-gray-500 ml-1 font-normal">(Leave empty to auto-calculate)</span>
                  </label>
                  <input
                    type="number"
                    placeholder={`Auto: ₹${(parseFloat(otFormData.hours || 0) * parseFloat(otFormData.hourly_rate || 0))}`}
                    value={otFormData.total_charges}
                    onChange={e => setOtFormData({ ...otFormData, total_charges: e.target.value })}
                    className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-sm text-amber-500 font-bold outline-none font-mono placeholder-gray-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Reason / Event Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Weekend dinner rush, banquet event"
                    value={otFormData.reason}
                    onChange={e => setOtFormData({ ...otFormData, reason: e.target.value })}
                    className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none"
                  />
                </div>

                {otFormError && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" /> {otFormError}
                  </p>
                )}

                <div className="flex gap-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowOvertimeModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-gray-200 font-bold text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOt}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingOt ? 'Logging...' : 'Save Overtime'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AppDialog dialogState={dialogState} closeDialog={closeDialog} />
    </div>
  );
};

export default StaffRosterPage;
