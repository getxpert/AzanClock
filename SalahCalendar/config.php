<?php
/**
 * SalahCalendar — Centralized Configuration
 *
 * All credentials, API keys, and environment-specific settings
 * are stored here. Other PHP files should require this file
 * instead of hardcoding values.
 */

/* ── Brevo (Sendinblue) Email API ───────────────────────────── */
define('BREVO_API_KEY', 'xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

/* ── MySQL Database ─────────────────────────────────────────── */
define('DB_HOST', 'localhost');
define('DB_NAME', 'azanclock_salah');
define('DB_USER', 'azanclock_usr');
define('DB_PASS', 'xxxxxxxxxxx');

/* ── Application ────────────────────────────────────────────── */
define('APP_BASE_URL', 'https://prayer.hablullah.app');

/* ── Email Sender ───────────────────────────────────────────── */
define('SENDER_EMAIL', 'salahcalendar@azanclock.com');
define('SENDER_NAME',  'Salah Calendar');
