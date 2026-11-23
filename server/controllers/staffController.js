const db = require('../db');

// Helper to get today's date in YYYY-MM-DD (IST)
const getTodayIST = () => {
  const d = new Date();
  // Adjust to IST (+5:30)
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  return ist.toISOString().split('T')[0];
};

// ── Staff CRUD ─────────────────────────────────────────────────────────────

const getAllStaff = (req, res) => {
  try {
    const { active } = req.query;
    let query = `
      SELECT s.*,
        (SELECT COUNT(*) FROM staff_attendance sa WHERE sa.staff_id = s.id AND sa.status = 'present') as total_present,
        (SELECT COUNT(*) FROM staff_attendance sa WHERE sa.staff_id = s.id AND sa.status = 'absent') as total_absent,
        (SELECT COALESCE(SUM(so.total_charges), 0) FROM staff_overtime so WHERE so.staff_id = s.id) as total_overtime_charges,
        (SELECT COALESCE(SUM(so.hours), 0) FROM staff_overtime so WHERE so.staff_id = s.id) as total_overtime_hours
      FROM staff s
    `;
    if (active === 'true') {
      query += ` WHERE s.is_active = 1`;
    }
    query += ` ORDER BY s.is_active DESC, s.name ASC`;

    const staffList = db.prepare(query).all();
    res.json({ success: true, data: staffList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStaffById = (req, res) => {
  try {
    const { id } = req.params;
    const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    const recentAttendance = db.prepare(
      'SELECT * FROM staff_attendance WHERE staff_id = ? ORDER BY date DESC LIMIT 30'
    ).all(id);
    const recentOvertime = db.prepare(
      'SELECT * FROM staff_overtime WHERE staff_id = ? ORDER BY date DESC LIMIT 20'
    ).all(id);

    res.json({
      success: true,
      data: {
        ...staff,
        recentAttendance,
        recentOvertime
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createStaff = (req, res) => {
  try {
    const {
      name,
      role = 'Staff',
      mobile_number,
      alt_number = '',
      address = '',
      salary_per_month = 0,
      joined_date
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Staff name is required.' });
    }
    if (!mobile_number || !mobile_number.trim()) {
      return res.status(400).json({ success: false, message: 'Mobile number is required.' });
    }

    const effectiveJoinedDate = joined_date || getTodayIST();
    const insert = db.prepare(`
      INSERT INTO staff (name, role, mobile_number, alt_number, address, salary_per_month, joined_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insert.run(
      name.trim(),
      role.trim() || 'Staff',
      mobile_number.trim(),
      (alt_number || '').trim(),
      (address || '').trim(),
      parseFloat(salary_per_month) || 0,
      effectiveJoinedDate
    );

    const created = db.prepare('SELECT * FROM staff WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateStaff = (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      role,
      mobile_number,
      alt_number,
      address,
      salary_per_month,
      is_active,
      joined_date
    } = req.body;

    const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    const update = db.prepare(`
      UPDATE staff SET
        name = COALESCE(?, name),
        role = COALESCE(?, role),
        mobile_number = COALESCE(?, mobile_number),
        alt_number = COALESCE(?, alt_number),
        address = COALESCE(?, address),
        salary_per_month = COALESCE(?, salary_per_month),
        is_active = COALESCE(?, is_active),
        joined_date = COALESCE(?, joined_date),
        updated_at = datetime('now')
      WHERE id = ?
    `);

    update.run(
      name ? name.trim() : null,
      role ? role.trim() : null,
      mobile_number ? mobile_number.trim() : null,
      alt_number !== undefined ? alt_number.trim() : null,
      address !== undefined ? address.trim() : null,
      salary_per_month !== undefined ? parseFloat(salary_per_month) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      joined_date || null,
      id
    );

    const updated = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteStaff = (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    db.prepare('DELETE FROM staff WHERE id = ?').run(id);
    res.json({ success: true, message: `Staff member ${existing.name} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Daily Attendance ───────────────────────────────────────────────────────

const getDailyAttendance = (req, res) => {
  try {
    const date = req.query.date || getTodayIST();
    // Return all active staff members with attendance record for the date (if any)
    const staffAttendance = db.prepare(`
      SELECT 
        s.id as staff_id,
        s.name,
        s.role,
        s.mobile_number,
        s.salary_per_month,
        s.is_active,
        COALESCE(sa.status, 'unmarked') as status,
        COALESCE(sa.check_in, '') as check_in,
        COALESCE(sa.check_out, '') as check_out,
        COALESCE(sa.notes, '') as notes,
        sa.id as attendance_id
      FROM staff s
      LEFT JOIN staff_attendance sa ON s.id = sa.staff_id AND sa.date = ?
      WHERE s.is_active = 1
      ORDER BY s.name ASC
    `).all(date);

    // Summary counts for this date
    const summary = {
      total: staffAttendance.length,
      present: staffAttendance.filter(s => s.status === 'present').length,
      absent: staffAttendance.filter(s => s.status === 'absent').length,
      half_day: staffAttendance.filter(s => s.status === 'half_day').length,
      leave: staffAttendance.filter(s => s.status === 'leave').length,
      unmarked: staffAttendance.filter(s => s.status === 'unmarked').length,
    };

    res.json({ success: true, date, data: staffAttendance, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAttendance = (req, res) => {
  try {
    const { date = getTodayIST(), records = [] } = req.body;
    // records: [{ staff_id, status: 'present'|'absent'|'half_day'|'leave', check_in, check_out, notes }]

    if (!records.length) {
      return res.status(400).json({ success: false, message: 'No attendance records provided.' });
    }

    const upsertStmt = db.prepare(`
      INSERT INTO staff_attendance (staff_id, date, status, check_in, check_out, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(staff_id, date) DO UPDATE SET
        status = excluded.status,
        check_in = excluded.check_in,
        check_out = excluded.check_out,
        notes = excluded.notes
    `);

    db.transaction(() => {
      for (const rec of records) {
        upsertStmt.run(
          rec.staff_id || rec.staffId,
          date,
          rec.status || 'present',
          rec.check_in || rec.checkIn || '',
          rec.check_out || rec.checkOut || '',
          rec.notes || ''
        );
      }
    })();

    res.json({ success: true, message: `Attendance saved for ${date}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Overtime Management ────────────────────────────────────────────────────

const getOvertimeRecords = (req, res) => {
  try {
    const { date, month, staff_id } = req.query;
    let query = `
      SELECT so.*, s.name as staff_name, s.role as staff_role, s.salary_per_month
      FROM staff_overtime so
      JOIN staff s ON so.staff_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND so.date = ?`;
      params.push(date);
    }
    if (month) {
      query += ` AND so.date LIKE ?`;
      params.push(`${month}%`);
    }
    if (staff_id) {
      query += ` AND so.staff_id = ?`;
      params.push(staff_id);
    }

    query += ` ORDER BY so.date DESC, so.id DESC`;
    const records = db.prepare(query).all(...params);

    const totalHours = records.reduce((sum, r) => sum + (r.hours || 0), 0);
    const totalCharges = records.reduce((sum, r) => sum + (r.total_charges || 0), 0);

    res.json({
      success: true,
      data: records,
      summary: { totalHours, totalCharges, totalRecords: records.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addOvertime = (req, res) => {
  try {
    const {
      staff_id,
      date = getTodayIST(),
      hours = 0,
      hourly_rate = 0,
      total_charges,
      reason = ''
    } = req.body;

    if (!staff_id) {
      return res.status(400).json({ success: false, message: 'Staff member is required.' });
    }

    const parsedHours = parseFloat(hours) || 0;
    const parsedHourlyRate = parseFloat(hourly_rate) || 0;
    const effectiveCharges = total_charges !== undefined && total_charges !== null && total_charges !== ''
      ? parseFloat(total_charges)
      : (parsedHours * parsedHourlyRate);

    const insert = db.prepare(`
      INSERT INTO staff_overtime (staff_id, date, hours, hourly_rate, total_charges, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = insert.run(
      staff_id,
      date,
      parsedHours,
      parsedHourlyRate,
      effectiveCharges,
      reason.trim()
    );

    const record = db.prepare(`
      SELECT so.*, s.name as staff_name, s.role as staff_role
      FROM staff_overtime so
      JOIN staff s ON so.staff_id = s.id
      WHERE so.id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteOvertime = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM staff_overtime WHERE id = ?').run(id);
    res.json({ success: true, message: 'Overtime record deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Monthly Roster & Payroll Summary ───────────────────────────────────────

const getMonthRosterSummary = (req, res) => {
  try {
    const month = req.query.month || getTodayIST().slice(0, 7); // 'YYYY-MM'
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthNum = parseInt(monthStr);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    const staffList = db.prepare('SELECT * FROM staff WHERE is_active = 1 ORDER BY name ASC').all();

    const summary = staffList.map(s => {
      // Attendance counts for this month
      const attendanceRows = db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM staff_attendance 
        WHERE staff_id = ? AND date LIKE ?
        GROUP BY status
      `).all(s.id, `${month}%`);

      const statusMap = {};
      attendanceRows.forEach(r => { statusMap[r.status] = r.count; });

      const presentDays = statusMap['present'] || 0;
      const absentDays = statusMap['absent'] || 0;
      const halfDays = statusMap['half_day'] || 0;
      const leaveDays = statusMap['leave'] || 0;

      // Overtime for this month
      const overtimeRow = db.prepare(`
        SELECT 
          COALESCE(SUM(hours), 0) as total_hours,
          COALESCE(SUM(total_charges), 0) as total_charges
        FROM staff_overtime 
        WHERE staff_id = ? AND date LIKE ?
      `).get(s.id, `${month}%`);

      const otHours = overtimeRow ? overtimeRow.total_hours : 0;
      const otCharges = overtimeRow ? overtimeRow.total_charges : 0;

      // Salary calculation (assume standard 30-day month or daysInMonth)
      const dailyRate = (s.salary_per_month || 0) / 30;
      const payableDays = presentDays + (halfDays * 0.5);
      const basePayEarned = Math.round(payableDays * dailyRate);
      const totalPayable = Math.round(basePayEarned + otCharges);

      return {
        staff_id: s.id,
        name: s.name,
        role: s.role,
        mobile_number: s.mobile_number,
        alt_number: s.alt_number,
        address: s.address,
        salary_per_month: s.salary_per_month,
        days_in_month: daysInMonth,
        present_days: presentDays,
        absent_days: absentDays,
        half_days: halfDays,
        leave_days: leaveDays,
        payable_days: payableDays,
        overtime_hours: otHours,
        overtime_charges: otCharges,
        base_pay_earned: basePayEarned,
        total_payable: totalPayable
      };
    });

    const grandTotals = {
      totalStaff: staffList.length,
      totalBaseSalary: staffList.reduce((acc, s) => acc + (s.salary_per_month || 0), 0),
      totalPayable: summary.reduce((acc, s) => acc + s.total_payable, 0),
      totalOvertimeCharges: summary.reduce((acc, s) => acc + s.overtime_charges, 0),
      totalOvertimeHours: summary.reduce((acc, s) => acc + s.overtime_hours, 0),
    };

    res.json({
      success: true,
      month,
      daysInMonth,
      summary,
      grandTotals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getDailyAttendance,
  markAttendance,
  getOvertimeRecords,
  addOvertime,
  deleteOvertime,
  getMonthRosterSummary
};
