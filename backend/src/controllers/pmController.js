const db = require('../config/db');
const {
  notifySchedule,
  notifyVendorCompleted,
  notifyBranchDecision,
} = require('../services/pmEmailNotifications');

const CHECKLIST_FIELDS = {
  upper_chamber: 'card_reader_clean pulley_condition motor_status receipt_printer_clean receipt_printer_health receipt_paper journal_printer_clean journal_printer_health journal_paper pe_core_clean maintenance_keyboard_clean pe_core_brightness lcd_crt_clean lcd_crt_condition epp_clean epp_health epp_sound fdk_clean fdk_health cabinetry_clean fascia_molding_clean'.split(' '),
  lower_chamber: 'presenter_module_clean presenter_lvdt_clean presenter_sector_clean transport_belt_clean timing_disk_clean paddle_wheel_clean air_filter_clean harness_clean bin_catch_condition presenter_sound shutter_assembly_clean bearing_clean pick_module_clean pick_module_belt_clean pick_module_timing_disk_set pick_module_d_wheel_set sensor_clean suction_cap_condition pick_arm_condition side_controller_board_condition solenoid_valve_clean mouse_plate_clean safe_assembly_clean cosmetic_door_clean cassette_pusher_status track_door_movement'.split(' '),
  media_quality: ['quality'],
  site_status: 'booth_cooling cooling_period ground_wire link_status camera_status ej_status'.split(' '),
};
const CHECKLIST_TASK_FIELDS = new Set([
  ...Object.values(CHECKLIST_FIELDS).flat().filter((field) => field.endsWith('_clean')),
  'pick_module_timing_disk_set',
  'pick_module_d_wheel_set',
  'track_door_movement',
]);

function hasCompleteVendorChecklist(checklist) {
  if (!checklist || typeof checklist !== 'object' || Array.isArray(checklist) ||
      Object.keys(checklist).length !== Object.keys(CHECKLIST_FIELDS).length) return false;

  return Object.entries(CHECKLIST_FIELDS).every(([section, fields]) => {
    const values = checklist[section];
    if (!values || typeof values !== 'object' || Array.isArray(values) ||
        Object.keys(values).length !== fields.length) return false;
    return fields.every((field) => {
      const value = values[field];
      return CHECKLIST_TASK_FIELDS.has(field)
        ? value === true
        : typeof value === 'string' && value.trim().length > 0;
    });
  });
}

function normalizeScheduleWindow(body) {
  const startRaw = body?.scheduled_date ?? body?.date_from ?? body?.from_date;
  const endRaw = body?.scheduled_end_date ?? body?.date_to ?? body?.to_date ?? startRaw;

  if (typeof startRaw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startRaw)) {
    return null;
  }
  if (typeof endRaw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(endRaw)) {
    return null;
  }

  const startDate = new Date(`${startRaw}T00:00:00Z`);
  const endDate = new Date(`${endRaw}T00:00:00Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  if (endDate < startDate) {
    return { invalid: true };
  }

  return {
    scheduled_date: startRaw,
    scheduled_end_date: endRaw,
  };
}

async function getEmailWarning(event, notification) {
  try {
    await notification();
    return null;
  } catch (err) {
    console.error(`Email notification failed after ${event}:`, err);
    return 'The change was saved, but email notification could not be sent. Check SMTP settings and backend logs.';
  }
}

// Get all PM visits with filter options
exports.getAllVisits = async (req, res) => {
  try {
    const { branch_id, status } = req.query;
    let queryText = `
      SELECT p.*, a.branch_id, a.model, a.serial_number, b.branch_name, b.branch_code
      FROM pm_visits p
      JOIN atms a ON p.terminal_id = a.terminal_id
      JOIN branches b ON a.branch_id = b.id
    `;
    const params = [];
    const conditions = [];

    if (req.user.role === 'BRANCH') {
      params.push(req.user.terminal_ids);
      conditions.push(`p.terminal_id = ANY($${params.length}::varchar[])`);
    } else if (branch_id) {
      params.push(branch_id);
      conditions.push(`a.branch_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY p.scheduled_date DESC, p.id DESC';

    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database server error' });
  }
};

// Create a new PM schedule (Admin)
exports.createSchedule = async (req, res) => {
  const { terminal_id, vendor_name } = req.body;
  const scheduleWindow = normalizeScheduleWindow(req.body);

  if (typeof terminal_id !== 'string' || !terminal_id.trim()) {
    return res.status(400).json({ error: 'A terminal ID is required' });
  }
  if (!scheduleWindow) {
    return res.status(400).json({ error: 'A valid schedule start date is required' });
  }
  if (scheduleWindow.invalid) {
    return res.status(400).json({ error: 'The schedule end date must be on or after the start date' });
  }

  try {
    const atm = await db.query(
      'SELECT id FROM atms WHERE terminal_id = $1 AND is_active = TRUE',
      [terminal_id.trim()]
    );
    if (!atm.rowCount) return res.status(400).json({ error: 'Selected terminal is not registered and active' });

    const duplicate = await db.query(
      `SELECT id FROM pm_visits
       WHERE terminal_id = $1
         AND scheduled_date <= $2::date
         AND COALESCE(scheduled_end_date, scheduled_date) >= $3::date`,
      [terminal_id.trim(), scheduleWindow.scheduled_end_date, scheduleWindow.scheduled_date]
    );
    if (duplicate.rowCount) return res.status(409).json({ error: 'This terminal already has a schedule overlapping the selected date range' });

    const result = await db.query(
      `INSERT INTO pm_visits (terminal_id, scheduled_date, scheduled_end_date, vendor_name)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [terminal_id.trim(), scheduleWindow.scheduled_date, scheduleWindow.scheduled_end_date, vendor_name || 'Moti Engineering']
    );
    const emailWarning = await getEmailWarning(
      'creating a PM schedule',
      () => notifySchedule(result.rows[0].id, 'created')
    );
    res.status(201).json({
      ...result.rows[0],
      ...(emailWarning ? { email_warning: emailWarning } : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(err.code === '23503' ? 400 : 500).json({ error: err.code === '23503' ? 'ATM terminal not found' : 'Failed to create PM schedule' });
  }
};

exports.updateSchedule = async (req, res) => {
  const visitId = Number(req.params.id);
  const { terminal_id } = req.body;
  const scheduleWindow = normalizeScheduleWindow(req.body);

  if (!Number.isInteger(visitId) || visitId < 1 ||
      typeof terminal_id !== 'string' || !terminal_id.trim()) {
    return res.status(400).json({ error: 'A valid schedule ID, terminal ID, and schedule date are required' });
  }
  if (!scheduleWindow) {
    return res.status(400).json({ error: 'A valid schedule start date is required' });
  }
  if (scheduleWindow.invalid) {
    return res.status(400).json({ error: 'The schedule end date must be on or after the start date' });
  }

  try {
    const existing = await db.query('SELECT status FROM pm_visits WHERE id = $1', [visitId]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Schedule not found' });
    if (existing.rows[0].status !== 'SCHEDULED') {
      return res.status(409).json({ error: 'Only scheduled visits can be edited. Confirmed and disputed visits are locked.' });
    }

    const atm = await db.query(
      'SELECT id FROM atms WHERE terminal_id = $1 AND is_active = TRUE',
      [terminal_id.trim()]
    );
    if (!atm.rowCount) return res.status(400).json({ error: 'Selected terminal is not registered and active' });

    const duplicate = await db.query(
      `SELECT id FROM pm_visits
       WHERE terminal_id = $1
         AND id <> $2
         AND scheduled_date <= $3::date
         AND COALESCE(scheduled_end_date, scheduled_date) >= $4::date`,
      [terminal_id.trim(), visitId, scheduleWindow.scheduled_end_date, scheduleWindow.scheduled_date]
    );
    if (duplicate.rowCount) return res.status(409).json({ error: 'This terminal already has a schedule overlapping the selected date range' });

    const updated = await db.query(
      `UPDATE pm_visits
       SET terminal_id = $1, scheduled_date = $2::date, scheduled_end_date = $3::date
       WHERE id = $4 AND status = 'SCHEDULED'
       RETURNING *`,
      [terminal_id.trim(), scheduleWindow.scheduled_date, scheduleWindow.scheduled_end_date, visitId]
    );
    if (!updated.rowCount) {
      return res.status(409).json({ error: 'Only scheduled visits can be edited. Confirmed and disputed visits are locked.' });
    }
    const emailWarning = await getEmailWarning('updating a PM schedule', () => notifySchedule(updated.rows[0].id, 'updated'));
    res.json({
      ...updated.rows[0],
      ...(emailWarning ? { email_warning: emailWarning } : {}),
    });
  } catch (err) {
    console.error('Failed to update PM schedule:', err);
    res.status(500).json({ error: 'Failed to update PM schedule' });
  }
};

exports.deleteSchedule = async (req, res) => {
  const visitId = Number(req.params.id);
  if (!Number.isInteger(visitId) || visitId < 1) {
    return res.status(400).json({ error: 'Invalid schedule ID' });
  }

  try {
    const existing = await db.query('SELECT status FROM pm_visits WHERE id = $1', [visitId]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Schedule not found' });
    if (existing.rows[0].status !== 'SCHEDULED') {
      return res.status(409).json({ error: 'Only scheduled visits can be deleted. Confirmed and disputed visits are locked.' });
    }

    const deleted = await db.query(
      `DELETE FROM pm_visits
       WHERE id = $1 AND status = 'SCHEDULED'
       RETURNING id`,
      [visitId]
    );
    if (!deleted.rowCount) {
      return res.status(409).json({ error: 'Only scheduled visits can be deleted. Confirmed and disputed visits are locked.' });
    }
    res.json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    console.error('Failed to delete PM schedule:', err);
    res.status(500).json({ error: 'Failed to delete PM schedule' });
  }
};

// Vendor marks visit as completed
exports.vendorComplete = async (req, res) => {
  const { id } = req.params;
  const {
    vendor_technician,
    vendor_notes,
    vendor_visit_date,
    work_start_time,
    work_finished_time,
    vendor_checklist,
  } = req.body;
  const validTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const validVisitDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!vendor_technician?.trim() || !vendor_notes?.trim()) {
    return res.status(400).json({ error: 'Technician name and maintenance notes are required' });
  }
  if (!validVisitDate(vendor_visit_date)) {
    return res.status(400).json({ error: 'A valid Moti visit date is required' });
  }
  if (!validTime(work_start_time) || !validTime(work_finished_time)) {
    return res.status(400).json({ error: 'Work start and finish times are required and must be valid' });
  }
  if (!hasCompleteVendorChecklist(vendor_checklist) ||
      !['GOOD', 'NOT_GOOD'].includes(vendor_checklist.site_status?.camera_status) ||
      !['GOOD', 'NOT_GOOD'].includes(vendor_checklist.site_status?.ej_status)) {
    return res.status(400).json({ error: 'Complete and verify every ATM checklist item, including camera and EJ status' });
  }
  if (!['GOOD', 'BAD'].includes(vendor_checklist.media_quality?.quality)) {
    return res.status(400).json({ error: 'Select Good or Bad for media quality' });
  }
  try {
    const result = await db.query(
      `UPDATE pm_visits
       SET status = 'VENDOR_COMPLETED',
           vendor_technician = $1,
           vendor_notes = $2,
           vendor_visit_date = $3::date,
           work_start_time = $4,
           work_finished_time = $5,
           vendor_checklist = $6::jsonb,
           vendor_completed_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND status = 'SCHEDULED' RETURNING *`,
      [vendor_technician.trim(), vendor_notes.trim(), vendor_visit_date, work_start_time, work_finished_time, JSON.stringify(vendor_checklist), id]
    );
    if (result.rows.length === 0) {
      const exists = await db.query('SELECT id FROM pm_visits WHERE id = $1', [id]);
      return res.status(exists.rowCount ? 409 : 404).json({ error: exists.rowCount ? 'Visit is no longer scheduled' : 'Visit record not found' });
    }
    const emailWarning = await getEmailWarning(
      'marking maintenance complete',
      () => notifyVendorCompleted(result.rows[0].id)
    );
    res.json({
      ...result.rows[0],
      ...(emailWarning ? { email_warning: emailWarning } : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update vendor completion' });
  }
};

// Branch confirms or disputes visit
exports.branchConfirm = async (req, res) => {
  const { id } = req.params;
  const { status, branch_remarks } = req.body;

  if (!['BRANCH_CONFIRMED', 'BRANCH_DISPUTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid confirmation status' });
  }

  try {
    const result = await db.query(
      `UPDATE pm_visits
       SET status = $1,
           cleanliness_rating = NULL,
           branch_remarks = $2,
           branch_confirmed_by = $3,
           branch_confirmed_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND status = 'VENDOR_COMPLETED'
         AND EXISTS (
           SELECT 1 FROM user_atms ua
           WHERE ua.terminal_id = pm_visits.terminal_id AND ua.user_id = $5
         )
       RETURNING *`,
      [status, branch_remarks, req.user.full_name, id, req.user.id]
    );
    if (result.rows.length === 0) {
      const exists = await db.query(
        `SELECT p.id FROM pm_visits p
         JOIN user_atms ua ON ua.terminal_id = p.terminal_id
         WHERE p.id = $1 AND ua.user_id = $2`,
        [id, req.user.id]
      );
      return res.status(exists.rowCount ? 409 : 404).json({ error: exists.rowCount ? 'Visit is not awaiting branch confirmation' : 'Visit record not found' });
    }
    const emailWarning = await getEmailWarning(
      'recording the branch response',
      () => notifyBranchDecision(result.rows[0].id)
    );
    res.json({
      ...result.rows[0],
      ...(emailWarning ? { email_warning: emailWarning } : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record branch response' });
  }
};

// Dashboard analytics endpoint
exports.getAnalytics = async (req, res) => {
  try {
    const terminalIds = req.user.role === 'BRANCH' ? req.user.terminal_ids : null;
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_visits,
        COUNT(CASE WHEN status = 'BRANCH_CONFIRMED' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'VENDOR_COMPLETED' THEN 1 END) as pending_branch,
        COUNT(CASE WHEN status = 'BRANCH_DISPUTED' THEN 1 END) as disputed,
        COUNT(CASE WHEN status = 'SCHEDULED' THEN 1 END) as pending_vendor
      FROM pm_visits p
      JOIN atms a ON p.terminal_id = a.terminal_id
      WHERE ($1::varchar[] IS NULL OR p.terminal_id = ANY($1::varchar[]))
    `, [terminalIds]);
    res.json(stats.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};
