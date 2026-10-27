const nodemailer = require('nodemailer');
const db = require('../config/db');
const createEmailService = require('../../../email-service');

const emailService = createEmailService({ nodemailer });

async function getVisit(visitId) {
  const result = await db.query(
    `SELECT p.id, p.terminal_id, p.scheduled_date::text AS scheduled_date, p.status,
            p.vendor_technician, p.vendor_notes, p.branch_confirmed_by,
            p.cleanliness_rating, p.branch_remarks, b.branch_name
     FROM pm_visits p
     JOIN atms a ON a.terminal_id = p.terminal_id
     JOIN branches b ON b.id = a.branch_id
     WHERE p.id = $1`,
    [visitId]
  );
  if (!result.rowCount) throw new Error('Schedule was saved but could not be loaded for email notification');
  return result.rows[0];
}

async function ensureUserEmailsAreReady() {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM users
     WHERE email IS NULL
        OR BTRIM(email) = ''
        OR email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'`
  );
  if (result.rows[0].count) {
    throw new Error('Add email addresses to every user account before sending notifications');
  }
}

function visitDetails(visit) {
  return [
    `Branch: ${visit.branch_name}`,
    `Terminal: ${visit.terminal_id}`,
    `Scheduled date: ${visit.scheduled_date}`,
  ];
}

async function sendToRecipients(recipients, subject, lines) {
  await ensureUserEmailsAreReady();
  if (!recipients.length) throw new Error('No user accounts are assigned to receive this notification');
  return emailService.send({ recipients, subject, text: lines.join('\n') });
}

async function getVisitRecipients(visitId, roles) {
  const result = await db.query(
    `SELECT DISTINCT u.email
     FROM users u
     WHERE u.role = ANY($2::varchar[])
       AND (
         u.role <> 'BRANCH'
         OR EXISTS (
           SELECT 1
           FROM user_atms ua
           JOIN pm_visits p ON p.terminal_id = ua.terminal_id
           WHERE p.id = $1 AND ua.user_id = u.id
         )
       )
     ORDER BY u.email`,
    [visitId, roles]
  );
  return result.rows.map((row) => row.email);
}

async function getAdminAndVendorRecipients() {
  const result = await db.query(
    `SELECT email
     FROM users
     WHERE role IN ('ADMIN', 'VENDOR')
     ORDER BY email`
  );
  return result.rows.map((row) => row.email);
}

async function notifySchedule(visitId, action) {
  const visit = await getVisit(visitId);
  const recipients = await getVisitRecipients(visitId, ['BRANCH']);
  const actionText = action === 'updated' ? 'updated' : 'created';
  return sendToRecipients(
    recipients,
    `PM schedule ${actionText}: ${visit.terminal_id}`,
    [
      `A PM schedule was ${actionText}.`,
      ...visitDetails(visit),
      'Please sign in to the Moti PM Tracking portal to review the schedule.',
    ]
  );
}

async function notifyVendorCompleted(visitId) {
  const visit = await getVisit(visitId);
  const recipients = await getVisitRecipients(visitId, ['BRANCH']);
  return sendToRecipients(
    recipients,
    `PM completed; branch confirmation required: ${visit.terminal_id}`,
    [
      'Maintenance has been marked complete. Please review and confirm or dispute it in the portal.',
      ...visitDetails(visit),
      `Technician: ${visit.vendor_technician || 'Not provided'}`,
      `Maintenance notes: ${visit.vendor_notes || 'Not provided'}`,
    ]
  );
}

async function notifyBranchDecision(visitId) {
  const visit = await getVisit(visitId);
  const recipients = await getAdminAndVendorRecipients();
  const confirmed = visit.status === 'BRANCH_CONFIRMED';
  return sendToRecipients(
    recipients,
    `Branch ${confirmed ? 'confirmed' : 'disputed'} PM: ${visit.terminal_id}`,
    [
      `The branch ${confirmed ? 'confirmed' : 'disputed'} the maintenance visit.`,
      ...visitDetails(visit),
      `Confirmed by: ${visit.branch_confirmed_by || 'Not provided'}`,
      `Cleanliness rating: ${visit.cleanliness_rating ?? 'Not provided'}`,
      `Branch remarks: ${visit.branch_remarks || 'None'}`,
    ]
  );
}

module.exports = { notifySchedule, notifyVendorCompleted, notifyBranchDecision };
