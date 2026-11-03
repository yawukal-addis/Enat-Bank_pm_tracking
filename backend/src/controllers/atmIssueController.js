const db = require('../config/db');

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const MAX_TARGET_HOURS = 8760;
const ZONES = ['ZONE_1', 'ZONE_2'];
const SEVERITIES = ['CRITICAL', 'MAJOR', 'MINOR'];

function addisDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}:${value.second}`;
}

function getMonthWindow(value) {
  const month = typeof value === 'string' && MONTH_PATTERN.test(value)
    ? value
    : addisDateTime().slice(0, 7);
  const [year, monthNumber] = month.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  const currentMonth = addisDateTime().slice(0, 7);
  const asOf = month === currentMonth
    ? addisDateTime().replace('T', ' ')
    : `${nextMonth} 00:00:00`;
  return { month, start: `${month}-01`, end: nextMonth, asOf };
}

function validLocalDateTime(value) {
  if (typeof value !== 'string' || !LOCAL_DATETIME_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.getFullYear() === Number(value.slice(0, 4)) &&
    parsed.getMonth() + 1 === Number(value.slice(5, 7)) &&
    parsed.getDate() === Number(value.slice(8, 10)) &&
    parsed.getHours() === Number(value.slice(11, 13)) &&
    parsed.getMinutes() === Number(value.slice(14, 16));
}

function positiveHours(value) {
  const hours = Number(value);
  const minutes = hours * 60;
  return Number.isFinite(hours) && hours > 0 && hours <= MAX_TARGET_HOURS &&
    Number(hours.toFixed(4)) === hours &&
    Math.round(minutes) >= 1;
}

function validMoney(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 9999999999.99;
}

function validClock(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

exports.getWorkspace = async (req, res) => {
  if (req.query.month && !MONTH_PATTERN.test(req.query.month)) {
    return res.status(400).json({ error: 'Select a valid performance month' });
  }
  const { month, start, end, asOf } = getMonthWindow(req.query.month);
  try {
    const [types, terminals, issues, metrics, slas, policy] = await Promise.all([
      db.query(
        `SELECT id, name, is_active
         FROM atm_issue_types
         ORDER BY is_active DESC, name`
      ),
      db.query(
        `SELECT a.terminal_id, a.branch_id, b.branch_name, a.zone, a.is_active
         FROM atms a
         JOIN branches b ON b.id = a.branch_id
         WHERE a.is_active = TRUE
            OR EXISTS (
              SELECT 1 FROM atm_issues i
              WHERE i.terminal_id = a.terminal_id
                AND i.reported_at >= $1::timestamp AND i.reported_at < $2::timestamp
            )
         ORDER BY b.branch_name, a.terminal_id`,
        [start, end]
      ),
      db.query(
        `SELECT i.id, i.terminal_id, b.branch_name, i.issue_type_id, t.name AS issue_type_name,
                i.severity, COALESCE(i.zone, a.zone) AS zone,
                to_char(i.reported_at, 'YYYY-MM-DD"T"HH24:MI') AS reported_at,
                i.description, i.response_target_hours, i.resolution_target_hours,
                to_char(i.response_due_at, 'YYYY-MM-DD"T"HH24:MI') AS response_due_at,
                to_char(i.resolution_due_at, 'YYYY-MM-DD"T"HH24:MI') AS resolution_due_at,
                to_char(i.vendor_response_at, 'YYYY-MM-DD"T"HH24:MI') AS vendor_response_at,
                to_char(i.resolved_at, 'YYYY-MM-DD"T"HH24:MI') AS resolved_at,
                i.resolution_notes,
                (i.vendor_response_at IS NOT NULL AND
                  i.vendor_response_at > i.response_due_at)
                OR (i.vendor_response_at IS NULL AND
                  $3::timestamp > i.response_due_at)
                  AS response_breached,
                (i.resolved_at IS NOT NULL AND
                  i.resolved_at > i.resolution_due_at)
                OR (i.resolved_at IS NULL AND
                  $3::timestamp > i.resolution_due_at)
                  AS resolution_breached
         FROM atm_issues i
         JOIN atms a ON a.terminal_id = i.terminal_id
         JOIN branches b ON b.id = a.branch_id
         JOIN atm_issue_types t ON t.id = i.issue_type_id
         WHERE i.reported_at >= $1::timestamp AND i.reported_at < $2::timestamp
         ORDER BY i.reported_at DESC, i.id DESC`,
        [start, end, asOf]
      ),
      db.query(
        `WITH issue_results AS (
           SELECT i.terminal_id,
             (i.resolved_at IS NOT NULL AND i.resolved_at > i.resolution_due_at)
               OR (i.resolved_at IS NULL AND $3::timestamp > i.resolution_due_at)
               AS resolution_breached
           FROM atm_issues i
           JOIN atms a ON a.terminal_id = i.terminal_id
             WHERE i.reported_at >= $1::timestamp AND i.reported_at < $2::timestamp
         ),
         issue_stats AS (
           SELECT terminal_id, COUNT(*)::int AS issue_count,
                  COUNT(*) FILTER (WHERE resolution_breached)::int AS resolution_breached_count
           FROM issue_results
           GROUP BY terminal_id
         )
         SELECT a.terminal_id, b.branch_name,
                a.zone,
                COALESCE(s.issue_count, 0)::int AS issue_count,
                COALESCE(s.resolution_breached_count, 0)::int AS resolution_breached_count,
                CASE WHEN COALESCE(s.issue_count, 0) = 0 THEN NULL
                     ELSE ROUND(s.resolution_breached_count * 100.0 / s.issue_count, 2)
                END AS resolution_breach_percent,
                f.monthly_fee, COALESCE(f.currency, 'ETB') AS currency,
                NULL::numeric AS penalty_amount
         FROM atms a
         JOIN branches b ON b.id = a.branch_id
         LEFT JOIN issue_stats s ON s.terminal_id = a.terminal_id
         LEFT JOIN atm_terminal_vendor_fees f
           ON f.terminal_id = a.terminal_id
         WHERE a.is_active = TRUE
         ORDER BY b.branch_name, a.terminal_id`,
        [start, end, asOf]
      ),
      db.query(
        `SELECT zone, severity, response_target_hours, resolution_target_hours
         FROM atm_issue_sla_settings
         ORDER BY zone, CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'MAJOR' THEN 2 ELSE 3 END`
      ),
      db.query('SELECT id, business_days, business_start, business_end FROM atm_issue_policy WHERE id = TRUE'),
    ]);

    const totalIssueCount = metrics.rows.reduce((total, item) => total + Number(item.issue_count || 0), 0);
    const resolutionBreachCount = metrics.rows.reduce((total, item) => total + Number(item.resolution_breached_count || 0), 0);
    const resolutionBreachRate = totalIssueCount > 0 ? resolutionBreachCount / totalIssueCount : 0;
    const missingFeeCount = metrics.rows.filter((item) => item.monthly_fee === null).length;
    const feeTotals = {};
    const penaltyTotals = {};
    for (const metric of metrics.rows) {
      if (metric.monthly_fee === null) continue;
      const feeCents = Math.round(Number(metric.monthly_fee) * 100);
      const issueCount = Number(metric.issue_count);
      const breachedCount = Number(metric.resolution_breached_count);
      const terminalRate = issueCount > 0 ? breachedCount / issueCount : 0;
      const penaltyCapCents = Math.floor(feeCents * 0.03 + 1e-9);
      const penaltyCents = Math.min(
        penaltyCapCents,
        Math.round(feeCents * 0.03 * terminalRate)
      );
      metric.penalty_amount = (penaltyCents / 100).toFixed(2);
      feeTotals[metric.currency] = (Number(feeTotals[metric.currency] || 0) + feeCents / 100).toFixed(2);
      penaltyTotals[metric.currency] = (Number(penaltyTotals[metric.currency] || 0) + penaltyCents / 100).toFixed(2);
    }

    res.json({
      month,
      issue_types: types.rows,
      terminals: terminals.rows,
      issues: issues.rows,
      monthly_metrics: metrics.rows,
      sla_settings: slas.rows,
      policy: policy.rows[0],
      resolution_breach_percent: Number((resolutionBreachRate * 100).toFixed(2)),
      penalty_cap_percent: 3,
      monthly_fee_totals: feeTotals,
      penalty_totals: penaltyTotals,
      missing_fee_count: missingFeeCount,
    });
  } catch (err) {
    console.error('Failed to load ATM issue workspace:', err);
    res.status(500).json({ error: 'Failed to load ATM issue workspace' });
  }
};

exports.createIssueType = async (req, res) => {
  const { name } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
    return res.status(400).json({ error: 'Enter an issue category name (up to 120 characters)' });
  }
  try {
    const result = await db.query(
      `INSERT INTO atm_issue_types (name)
       VALUES ($1)
       RETURNING id, name, is_active`,
      [name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'An issue type with that name already exists' });
    console.error('Failed to create ATM issue type:', err);
    res.status(500).json({ error: 'Failed to create ATM issue type' });
  }
};

exports.updateIssueType = async (req, res) => {
  const typeId = Number(req.params.id);
  const { name, is_active } = req.body;
  if (!Number.isInteger(typeId) || typeId < 1 ||
      typeof name !== 'string' || !name.trim() || name.trim().length > 120 ||
      typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'Enter a valid issue category name and active state' });
  }
  try {
    const result = await db.query(
      `UPDATE atm_issue_types
       SET name = $1, is_active = $2
       WHERE id = $3
       RETURNING id, name, is_active`,
      [name.trim(), is_active, typeId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Issue type not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'An issue type with that name already exists' });
    console.error('Failed to update ATM issue type:', err);
    res.status(500).json({ error: 'Failed to update ATM issue type' });
  }
};

exports.saveSlaSettings = async (req, res) => {
  const { settings } = req.body || {};
  const expected = new Set(ZONES.flatMap((zone) => SEVERITIES.map((severity) => `${zone}:${severity}`)));
  if (!Array.isArray(settings) || settings.length !== expected.size) {
    return res.status(400).json({ error: 'Provide response and resolution targets for all six zone/severity combinations' });
  }
  const normalized = settings.map((setting) => ({
    zone: setting && typeof setting === 'object' ? setting.zone : null,
    severity: setting && typeof setting === 'object' ? setting.severity : null,
    response: Number(setting?.response_target_hours),
    resolution: Number(setting?.resolution_target_hours),
  }));
  if (normalized.some((setting) =>
    !expected.delete(`${setting.zone}:${setting.severity}`) ||
    !positiveHours(setting.response) ||
    !positiveHours(setting.resolution)
  ) || expected.size > 0) {
    return res.status(400).json({ error: 'Each zone/severity needs response and resolution targets in hours (up to 8760; precision to one minute)' });
  }
  const targets = new Map(normalized.map((setting) => [`${setting.zone}:${setting.severity}`, setting]));
  for (const severity of SEVERITIES) {
    const zone1 = targets.get(`ZONE_1:${severity}`);
    const zone2 = targets.get(`ZONE_2:${severity}`);
    if (zone1.response >= zone2.response || zone1.resolution >= zone2.resolution) {
      return res.status(400).json({ error: 'Zone 1 response and resolution targets must be shorter than Zone 2 for each severity' });
    }
  }
  for (const zone of ZONES) {
    const critical = targets.get(`${zone}:CRITICAL`);
    const major = targets.get(`${zone}:MAJOR`);
    const minor = targets.get(`${zone}:MINOR`);
    if (critical.response >= major.response || major.response >= minor.response ||
        critical.resolution >= major.resolution || major.resolution >= minor.resolution) {
      return res.status(400).json({ error: 'Critical targets must be shorter than Major targets, which must be shorter than Minor targets' });
    }
  }

  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');
    for (const setting of normalized) {
      await client.query(
        `UPDATE atm_issue_sla_settings
         SET response_target_hours = $1, resolution_target_hours = $2
         WHERE zone = $3 AND severity = $4`,
        [setting.response, setting.resolution, setting.zone, setting.severity]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Zone and severity SLA targets saved', settings: normalized });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Failed to save ATM issue SLA settings:', err);
    res.status(500).json({ error: 'Failed to save SLA settings' });
  } finally {
    client?.release();
  }
};

exports.savePolicy = async (req, res) => {
  const { business_days, business_start, business_end } = req.body || {};
  const days = Array.isArray(business_days) ? [...new Set(business_days.map(Number))].sort() : [];
  if (!days.length || days.some((day) => !Number.isInteger(day) || day < 1 || day > 7) ||
      !validClock(business_start) || !validClock(business_end) || business_start >= business_end) {
    return res.status(400).json({ error: 'Enter valid business days and working hours' });
  }
  try {
    const result = await db.query(
      `UPDATE atm_issue_policy
       SET business_days = $1::smallint[], business_start = $2::time, business_end = $3::time
       WHERE id = TRUE
       RETURNING id, business_days, business_start, business_end`,
      [days, business_start, business_end]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to save ATM issue policy:', err);
    res.status(500).json({ error: 'Failed to save ATM issue policy' });
  }
};

exports.updateTerminalZone = async (req, res) => {
  const { zone } = req.body || {};
  if (!ZONES.includes(zone)) {
    return res.status(400).json({ error: 'Select Zone 1 or Zone 2' });
  }
  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE atms SET zone = $1
       WHERE terminal_id = $2 AND is_active = TRUE
       RETURNING terminal_id, zone`,
      [zone, req.params.terminalId]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Active ATM terminal not found' });
    }
    await client.query(
      'UPDATE atm_issues SET zone = $1 WHERE terminal_id = $2 AND zone IS NULL',
      [zone, req.params.terminalId]
    );
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Failed to update ATM terminal zone:', err);
    res.status(500).json({ error: 'Failed to update ATM terminal zone' });
  } finally {
    client?.release();
  }
};

exports.createIssue = async (req, res) => {
  const { terminal_id, issue_type_id, severity, reported_at, description } = req.body || {};
  const typeId = Number(issue_type_id);
  if (typeof terminal_id !== 'string' || !terminal_id.trim() ||
      !Number.isInteger(typeId) || typeId < 1 ||
      !SEVERITIES.includes(severity) ||
      !validLocalDateTime(reported_at) ||
      typeof description !== 'string' || !description.trim() || description.trim().length > 5000) {
    return res.status(400).json({ error: 'Enter an active terminal, issue type, severity, valid report date/time, and issue description' });
  }
  try {
    const terminal = await db.query(
      'SELECT terminal_id, zone FROM atms WHERE terminal_id = $1 AND is_active = TRUE',
      [terminal_id.trim()]
    );
    if (!terminal.rowCount) return res.status(400).json({ error: 'The selected terminal is not registered and active' });
    if (!terminal.rows[0].zone) return res.status(400).json({ error: 'Assign this terminal to Zone 1 or Zone 2 before registering an issue' });
    const type = await db.query(
      'SELECT id FROM atm_issue_types WHERE id = $1 AND is_active = TRUE',
      [typeId]
    );
    if (!type.rowCount) return res.status(400).json({ error: 'The selected issue type is not active' });
    const sla = await db.query(
      `SELECT response_target_hours, resolution_target_hours
       FROM atm_issue_sla_settings
       WHERE zone = $1 AND severity = $2`,
      [terminal.rows[0].zone, severity]
    );
    if (!sla.rowCount || !sla.rows[0].response_target_hours || !sla.rows[0].resolution_target_hours) {
      return res.status(409).json({ error: `Configure response and resolution SLA targets for ${terminal.rows[0].zone.replace('_', ' ')} ${severity.toLowerCase()} issues first` });
    }

    const result = await db.query(
      `INSERT INTO atm_issues
         (terminal_id, issue_type_id, severity, zone, response_target_minutes, resolution_target_minutes,
          response_target_hours, resolution_target_hours,
          reported_at, response_due_at, resolution_due_at, description, created_by)
       VALUES ($1, $2, $3, $4, ROUND($5::numeric * 60)::int, ROUND($6::numeric * 60)::int, $5, $6, $7::timestamp,
               atm_add_business_minutes($7::timestamp, ROUND($5::numeric * 60)::int),
               atm_add_business_minutes($7::timestamp, ROUND($6::numeric * 60)::int), $8, $9)
       RETURNING id, terminal_id, issue_type_id, severity, zone, response_target_hours, resolution_target_hours,
                 reported_at, response_due_at, resolution_due_at, description, vendor_response_at, resolved_at, resolution_notes`,
      [
        terminal.rows[0].terminal_id,
        type.rows[0].id,
        severity,
        terminal.rows[0].zone,
        sla.rows[0].response_target_hours,
        sla.rows[0].resolution_target_hours,
        reported_at,
        description.trim(),
        req.user.id,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to register ATM issue:', err);
    res.status(500).json({ error: 'Failed to register ATM issue' });
  }
};

exports.updateIssue = async (req, res) => {
  const issueId = Number(req.params.id);
  const {
    terminal_id,
    issue_type_id,
    severity,
    reported_at,
    description,
    vendor_response_at,
    resolved_at,
    resolution_notes,
  } = req.body || {};
  const typeId = Number(issue_type_id);
  const responseAt = vendor_response_at || null;
  const resolvedAt = resolved_at || null;
  if (!Number.isInteger(issueId) || issueId < 1 ||
      typeof terminal_id !== 'string' || !terminal_id.trim() ||
      !Number.isInteger(typeId) || typeId < 1 ||
      !SEVERITIES.includes(severity) ||
      !validLocalDateTime(reported_at) ||
      typeof description !== 'string' || !description.trim() || description.trim().length > 5000 ||
      (responseAt !== null && !validLocalDateTime(responseAt)) ||
      (resolvedAt !== null && !validLocalDateTime(resolvedAt)) ||
      (resolution_notes !== undefined && (typeof resolution_notes !== 'string' || resolution_notes.length > 5000))) {
    return res.status(400).json({ error: 'Enter valid issue details, response/resolution dates, and notes' });
  }

  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT terminal_id, issue_type_id, severity, zone,
              to_char(reported_at, 'YYYY-MM-DD"T"HH24:MI') AS reported_at,
              to_char(response_due_at, 'YYYY-MM-DD"T"HH24:MI') AS response_due_at,
              to_char(resolution_due_at, 'YYYY-MM-DD"T"HH24:MI') AS resolution_due_at,
              response_target_minutes, resolution_target_minutes,
              response_target_hours, resolution_target_hours
       FROM atm_issues WHERE id = $1 FOR UPDATE`,
      [issueId]
    );
    if (!existing.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ATM issue not found' });
    }
    const current = existing.rows[0];
    if ((responseAt && responseAt < reported_at) ||
        (resolvedAt && resolvedAt < reported_at) ||
        (responseAt && resolvedAt && resolvedAt < responseAt)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Response must be after the report, and resolution must be after both report and response' });
    }

    const terminal = await client.query(
      'SELECT terminal_id, zone FROM atms WHERE terminal_id = $1 AND is_active = TRUE',
      [terminal_id.trim()]
    );
    if (!terminal.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'The selected terminal is not registered and active' });
    }
    const type = await client.query(
      `SELECT id FROM atm_issue_types
       WHERE id = $1 AND (is_active = TRUE OR id = $2)`,
      [typeId, current.issue_type_id]
    );
    if (!type.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'The selected issue category is not active' });
    }

    const slaChanged = current.terminal_id !== terminal.rows[0].terminal_id ||
      current.severity !== severity ||
      current.reported_at !== reported_at;
    const issueZone = terminal.rows[0].zone || (!slaChanged ? current.zone : null);
    if (!issueZone) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Assign the selected terminal to Zone 1 or Zone 2 before changing the issue SLA details' });
    }
    let responseHours = Number(current.response_target_hours || current.response_target_minutes / 60);
    let resolutionHours = Number(current.resolution_target_hours || current.resolution_target_minutes / 60);
    let responseMinutes = Number(current.response_target_minutes);
    let resolutionMinutes = Number(current.resolution_target_minutes);
    let responseDueAt = current.response_due_at;
    let resolutionDueAt = current.resolution_due_at;
    if (slaChanged) {
      const sla = await client.query(
        `SELECT response_target_hours, resolution_target_hours
         FROM atm_issue_sla_settings
         WHERE zone = $1 AND severity = $2`,
        [issueZone, severity]
      );
      if (!sla.rowCount || !sla.rows[0].response_target_hours || !sla.rows[0].resolution_target_hours) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Configure response and resolution SLA targets for ${issueZone.replace('_', ' ')} ${severity.toLowerCase()} issues first` });
      }
      responseHours = Number(sla.rows[0].response_target_hours);
      resolutionHours = Number(sla.rows[0].resolution_target_hours);
      responseMinutes = Math.round(responseHours * 60);
      resolutionMinutes = Math.round(resolutionHours * 60);
      const deadlines = await client.query(
        `SELECT
           to_char(atm_add_business_minutes($1::timestamp, $2), 'YYYY-MM-DD"T"HH24:MI') AS response_due_at,
           to_char(atm_add_business_minutes($1::timestamp, $3), 'YYYY-MM-DD"T"HH24:MI') AS resolution_due_at`,
        [reported_at, responseMinutes, resolutionMinutes]
      );
      responseDueAt = deadlines.rows[0].response_due_at;
      resolutionDueAt = deadlines.rows[0].resolution_due_at;
    }

    const result = await client.query(
      `UPDATE atm_issues
       SET terminal_id = $1, issue_type_id = $2, severity = $3, zone = $4,
           reported_at = $5::timestamp, description = $6,
           response_target_minutes = $7, resolution_target_minutes = $8,
           response_target_hours = $9, resolution_target_hours = $10,
           response_due_at = $11::timestamp, resolution_due_at = $12::timestamp,
           vendor_response_at = $13::timestamp, resolved_at = $14::timestamp,
           resolution_notes = $15, updated_at = CURRENT_TIMESTAMP
       WHERE id = $16
       RETURNING id, terminal_id, issue_type_id, severity, zone, reported_at, description,
                 response_target_hours, resolution_target_hours, response_due_at, resolution_due_at,
                 vendor_response_at, resolved_at, resolution_notes`,
      [
        terminal.rows[0].terminal_id, type.rows[0].id, severity, issueZone,
        reported_at, description.trim(), responseMinutes, resolutionMinutes,
        responseHours, resolutionHours, responseDueAt, resolutionDueAt,
        responseAt, resolvedAt, resolution_notes?.trim() || null, issueId,
      ]
    );
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Failed to update ATM issue:', err);
    res.status(500).json({ error: 'Failed to update ATM issue' });
  } finally {
    client?.release();
  }
};

exports.deleteIssue = async (req, res) => {
  const issueId = Number(req.params.id);
  if (!Number.isInteger(issueId) || issueId < 1) {
    return res.status(400).json({ error: 'Enter a valid ATM issue ID' });
  }
  try {
    const result = await db.query('DELETE FROM atm_issues WHERE id = $1 RETURNING id', [issueId]);
    if (!result.rowCount) return res.status(404).json({ error: 'ATM issue not found' });
    res.json({ message: 'ATM issue deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('Failed to delete ATM issue:', err);
    res.status(500).json({ error: 'Failed to delete ATM issue' });
  }
};

exports.saveMonthlyFee = async (req, res) => {
  const { terminal_id, monthly_fee, currency } = req.body || {};
  const fee = Number(monthly_fee);
  const normalizedCurrency = typeof currency === 'string' ? currency.trim().toUpperCase() : '';
  if (typeof terminal_id !== 'string' || !terminal_id.trim() ||
      !validMoney(fee) ||
      !/^[A-Z]{3}$/.test(normalizedCurrency)) {
    return res.status(400).json({ error: 'Enter a terminal, monthly fee, and three-letter currency' });
  }
  try {
    const result = await db.query(
      `INSERT INTO atm_terminal_vendor_fees (terminal_id, monthly_fee, currency)
       SELECT terminal_id, $2, $3
       FROM atms WHERE terminal_id = $1 AND is_active = TRUE
       ON CONFLICT (terminal_id)
       DO UPDATE SET monthly_fee = EXCLUDED.monthly_fee, currency = EXCLUDED.currency, updated_at = CURRENT_TIMESTAMP
       RETURNING terminal_id, monthly_fee, currency`,
      [terminal_id.trim(), fee.toFixed(2), normalizedCurrency]
    );
    if (!result.rowCount) return res.status(400).json({ error: 'The selected terminal is not registered and active' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to save monthly ATM vendor fee:', err);
    res.status(500).json({ error: 'Failed to save monthly ATM vendor fee' });
  }
};
