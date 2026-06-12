<?php
/**
 * SalahCalendar — Calendar & Account API
 *
 * REST endpoint for account management and calendar CRUD.
 * All actions are dispatched via $_POST['action'] or $_GET['action'].
 *
 * Actions:
 *   register       — Create user + calendar, email dynamic link
 *   send-otp       — Send OTP to calendar owner for login
 *   verify-otp     — Verify OTP, return calendar params
 *   get-calendar   — Public: retrieve calendar params by key
 *   update-calendar— Update calendar params (requires OTP session)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/BrevoEmailService.php';

/* ══════════════════════════════════════════════════════════════
   CORS & Preflight
══════════════════════════════════════════════════════════════ */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/* ══════════════════════════════════════════════════════════════
   Database Connection (PDO)
══════════════════════════════════════════════════════════════ */
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

/* ══════════════════════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════════════════════ */
function jsonOK($data = []) {
    echo json_encode(array_merge(['success' => true], $data));
    exit;
}
function jsonErr($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $msg]);
    exit;
}
function requirePost($key) {
    $val = isset($_POST[$key]) ? trim($_POST[$key]) : '';
    if ($val === '') jsonErr("Missing required field: $key");
    return $val;
}
function optionalPost($key, $default = '') {
    return isset($_POST[$key]) ? trim($_POST[$key]) : $default;
}
function maskEmail($email) {
    $parts = explode('@', $email);
    if (count($parts) !== 2) return $email;
    $local = $parts[0];
    $domain = $parts[1];
    if (strlen($local) <= 2) return $local[0] . '***@' . $domain;
    return $local[0] . str_repeat('*', min(strlen($local) - 2, 4)) . substr($local, -1) . '@' . $domain;
}

/* ══════════════════════════════════════════════════════════════
   ACTION: register
   Creates user (or finds existing), creates calendar, sends link
══════════════════════════════════════════════════════════════ */
function actionRegister() {
    $email       = requirePost('email');
    $calendarKey = requirePost('calendar_key');
    $paramsJson  = requirePost('params');
    $name        = optionalPost('name');
    $phone       = optionalPost('phone');
    $city        = optionalPost('city');
    $country     = optionalPost('country');

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonErr('Please provide a valid email address.');
    }

    // Validate calendar key (8-char alphanumeric)
    if (!preg_match('/^[a-zA-Z0-9]{6,12}$/', $calendarKey)) {
        jsonErr('Invalid calendar key format.');
    }

    // Validate params JSON
    $params = json_decode($paramsJson, true);
    if (!$params || !isset($params['lat']) || !isset($params['lng'])) {
        jsonErr('Invalid calendar parameters.');
    }

    $db = getDB();

    // ── Find or create user ──────────────────────────────────
    $stmt = $db->prepare('SELECT id, email, name FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        $stmt = $db->prepare(
            'INSERT INTO users (email, name, city, country, phone, auth_provider)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$email, $name, $city, $country, $phone, 'email']);
        $userId = $db->lastInsertId();
    } else {
        $userId = $user['id'];
        // Update profile fields if provided and user has blanks
        if ($name || $phone || $city || $country) {
            $stmt = $db->prepare(
                'UPDATE users SET
                    name    = COALESCE(NULLIF(?, ""), name),
                    city    = COALESCE(NULLIF(?, ""), city),
                    country = COALESCE(NULLIF(?, ""), country),
                    phone   = COALESCE(NULLIF(?, ""), phone)
                 WHERE id = ?'
            );
            $stmt->execute([$name, $city, $country, $phone, $userId]);
        }
    }

    // ── Check for duplicate calendar key ─────────────────────
    $stmt = $db->prepare('SELECT id FROM salah_calendars WHERE calendar_key = ?');
    $stmt->execute([$calendarKey]);
    if ($stmt->fetch()) {
        jsonErr('This calendar key already exists. Please refresh to generate a new one.');
    }

    // ── Create calendar entry ────────────────────────────────
    $stmt = $db->prepare(
        'INSERT INTO salah_calendars (calendar_key, user_id, params)
         VALUES (?, ?, ?)'
    );
    $stmt->execute([$calendarKey, $userId, json_encode($params)]);

    // ── Build dynamic link ───────────────────────────────────
    $dynamicLink = APP_BASE_URL . '/prayer.php?cid=' . urlencode($calendarKey);
    $webcalLink  = str_replace('https://', 'webcal://', $dynamicLink);

    // ── Send email ───────────────────────────────────────────
    $locationName = $params['location'] ?? 'your location';
    $emailService = new BrevoEmailService(BREVO_API_KEY);
    $htmlBody = buildCalendarEmailHTML($dynamicLink, $webcalLink, $locationName, $calendarKey);
    $result = $emailService->sendEmail($email, 'Your Salah Calendar Subscription Link', $htmlBody, $name ?: '');

    if (!$result['success']) {
        // Calendar was created but email failed — still return success with link
        jsonOK([
            'calendar_key' => $calendarKey,
            'dynamic_link' => $dynamicLink,
            'webcal_link'  => $webcalLink,
            'email_sent'   => false,
            'email_error'  => $result['message'],
        ]);
    }

    jsonOK([
        'calendar_key' => $calendarKey,
        'dynamic_link' => $dynamicLink,
        'webcal_link'  => $webcalLink,
        'email_sent'   => true,
    ]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: send-otp
   Sends OTP to the owner of a calendar (looked up by key)
══════════════════════════════════════════════════════════════ */
function actionSendOTP() {
    $calendarKey = requirePost('calendar_key');

    $db = getDB();

    // Look up calendar → user
    $stmt = $db->prepare(
        'SELECT sc.id AS cal_id, sc.user_id, u.email, u.name
         FROM salah_calendars sc
         JOIN users u ON u.id = sc.user_id
         WHERE sc.calendar_key = ?'
    );
    $stmt->execute([$calendarKey]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonErr('Calendar not found.', 404);
    }

    $email = $row['email'];

    // Generate OTP (6 digits)
    $code   = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
    $expiry = date('Y-m-d H:i:s', time() + 600); // 10 minutes

    $stmt = $db->prepare('INSERT INTO email_otps (email, code, expiry) VALUES (?, ?, ?)');
    $stmt->execute([$email, $code, $expiry]);

    // Send OTP email
    $emailService = new BrevoEmailService(BREVO_API_KEY);
    $htmlBody = buildOTPEmailHTML($code, $row['name'] ?: '');
    $emailService->sendEmail($email, 'Your Salah Calendar Verification Code', $htmlBody, $row['name'] ?: '');

    jsonOK([
        'masked_email' => maskEmail($email),
        'expires_in'   => 600,
    ]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: verify-otp
   Verifies OTP and returns calendar data
══════════════════════════════════════════════════════════════ */
function actionVerifyOTP() {
    $calendarKey = requirePost('calendar_key');
    $code        = requirePost('code');

    $db = getDB();

    // Look up calendar → user email
    $stmt = $db->prepare(
        'SELECT sc.id AS cal_id, sc.params, u.email, u.name, u.id AS user_id
         FROM salah_calendars sc
         JOIN users u ON u.id = sc.user_id
         WHERE sc.calendar_key = ?'
    );
    $stmt->execute([$calendarKey]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonErr('Calendar not found.', 404);
    }

    // Verify OTP
    $stmt = $db->prepare(
        'SELECT id FROM email_otps
         WHERE email = ? AND code = ? AND expiry > NOW()
         ORDER BY created_at DESC LIMIT 1'
    );
    $stmt->execute([$row['email'], $code]);
    $otp = $stmt->fetch();

    if (!$otp) {
        jsonErr('Invalid or expired verification code.', 401);
    }

    // Delete used OTP
    $stmt = $db->prepare('DELETE FROM email_otps WHERE id = ?');
    $stmt->execute([$otp['id']]);

    jsonOK([
        'calendar_key' => $calendarKey,
        'params'       => json_decode($row['params'], true),
        'user' => [
            'email' => $row['email'],
            'name'  => $row['name'],
        ],
        'authenticated' => true,
    ]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: get-calendar
   Public endpoint — returns calendar params by key (no auth)
══════════════════════════════════════════════════════════════ */
function actionGetCalendar() {
    $key = isset($_GET['key']) ? trim($_GET['key']) : '';
    if ($key === '') jsonErr('Missing calendar key.');

    $db = getDB();

    $stmt = $db->prepare(
        'SELECT sc.calendar_key, sc.params, sc.created_at, sc.modified_at,
                u.email, u.name
         FROM salah_calendars sc
         JOIN users u ON u.id = sc.user_id
         WHERE sc.calendar_key = ?'
    );
    $stmt->execute([$key]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonErr('Calendar not found.', 404);
    }

    jsonOK([
        'calendar_key' => $row['calendar_key'],
        'params'       => json_decode($row['params'], true),
        'owner_email'  => maskEmail($row['email']),
        'created_at'   => $row['created_at'],
        'modified_at'  => $row['modified_at'],
    ]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: update-calendar
   Updates calendar params (requires prior OTP verification)
══════════════════════════════════════════════════════════════ */
function actionUpdateCalendar() {
    $calendarKey = requirePost('calendar_key');
    $email       = requirePost('email');
    $paramsJson  = requirePost('params');

    // Validate params JSON
    $params = json_decode($paramsJson, true);
    if (!$params || !isset($params['lat']) || !isset($params['lng'])) {
        jsonErr('Invalid calendar parameters.');
    }

    $db = getDB();

    // Verify that the email matches the calendar owner
    $stmt = $db->prepare(
        'SELECT sc.id AS cal_id, u.email
         FROM salah_calendars sc
         JOIN users u ON u.id = sc.user_id
         WHERE sc.calendar_key = ?'
    );
    $stmt->execute([$calendarKey]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonErr('Calendar not found.', 404);
    }
    if (strtolower($row['email']) !== strtolower($email)) {
        jsonErr('Unauthorized: email does not match calendar owner.', 403);
    }

    // Update params
    $stmt = $db->prepare(
        'UPDATE salah_calendars SET params = ?, modified_at = NOW() WHERE calendar_key = ?'
    );
    $stmt->execute([json_encode($params), $calendarKey]);

    jsonOK(['calendar_key' => $calendarKey, 'updated' => true]);
}

/* ══════════════════════════════════════════════════════════════
   Email Templates
══════════════════════════════════════════════════════════════ */
function buildCalendarEmailHTML($httpsLink, $webcalLink, $location, $calendarKey) {
    $year = date('Y');
    return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f7f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f5;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#1B7A56,#228E64);padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">🕌 Salah Calendar</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your Prayer Times Subscription</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 16px;color:#1a2b22;font-size:15px;line-height:1.6;">
      Assalamu Alaikum! Your personalised Salah Calendar for <strong>{$location}</strong> is ready.
    </p>
    <p style="margin:0 0 8px;color:#6a7f72;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Your Calendar ID</p>
    <p style="margin:0 0 24px;background:#eaf0e6;border-radius:8px;padding:12px 16px;font-family:monospace;font-size:15px;color:#1B7A56;word-break:break-all;">{$calendarKey}</p>
    <p style="margin:0 0 8px;color:#6a7f72;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Subscribe in your calendar app</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding:8px 0;">
        <a href="{$webcalLink}" style="display:inline-block;background:#1B7A56;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">📅 Subscribe (Apple/Outlook Mac)</a>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;color:#6a7f72;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Or copy this link</p>
    <p style="margin:0 0 24px;background:#f8f9fa;border:1px solid #e2e8e4;border-radius:8px;padding:12px 16px;font-family:monospace;font-size:13px;color:#C08B18;word-break:break-all;">{$httpsLink}</p>
    <div style="background:#fffbf0;border:1px solid #f0e6c8;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0;color:#8b6914;font-size:13px;line-height:1.6;">
        <strong>How to subscribe:</strong><br>
        • <strong>Google Calendar:</strong> Other calendars → From URL → paste the link above<br>
        • <strong>Outlook Web:</strong> Add calendar → Subscribe from web → paste the link<br>
        • <strong>Apple Calendar:</strong> Click the Subscribe button above, or File → New Calendar Subscription
      </p>
    </div>
    <p style="margin:0;color:#6a7f72;font-size:13px;line-height:1.6;">
      The feed refreshes automatically. You can modify your calendar settings anytime by visiting your Calendar ID page.
    </p>
  </td></tr>
  <tr><td style="background:#f4f7f5;padding:20px 40px;text-align:center;border-top:1px solid #e2e8e4;">
    <p style="margin:0;color:#6a7f72;font-size:12px;">© {$year} Salah Calendar by Hablullah · <a href="https://prayer.hablullah.app" style="color:#1B7A56;text-decoration:none;">prayer.hablullah.app</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>
HTML;
}

function buildOTPEmailHTML($code, $name) {
    $greeting = $name ? "Assalamu Alaikum {$name}," : "Assalamu Alaikum,";
    $year = date('Y');
    return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f7f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f5;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#1B7A56,#228E64);padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">🔐 Verification Code</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Salah Calendar Login</p>
  </td></tr>
  <tr><td style="padding:32px 40px;text-align:center;">
    <p style="margin:0 0 24px;color:#1a2b22;font-size:15px;line-height:1.6;text-align:left;">{$greeting}</p>
    <p style="margin:0 0 8px;color:#6a7f72;font-size:13px;text-align:left;">Your one-time verification code is:</p>
    <div style="background:#eaf0e6;border-radius:12px;padding:20px;margin:16px 0 24px;display:inline-block;">
      <span style="font-family:monospace;font-size:36px;font-weight:700;color:#1B7A56;letter-spacing:8px;">{$code}</span>
    </div>
    <p style="margin:0 0 8px;color:#6a7f72;font-size:13px;line-height:1.6;text-align:left;">
      This code expires in <strong>10 minutes</strong>. If you didn't request this code, please ignore this email.
    </p>
    <div style="background:#fff5f5;border:1px solid #fce0e0;border-radius:8px;padding:12px;margin-top:16px;text-align:left;">
      <p style="margin:0;color:#c94a3a;font-size:12px;">⚠️ Never share this code with anyone. Salah Calendar will never ask for it outside the app.</p>
    </div>
  </td></tr>
  <tr><td style="background:#f4f7f5;padding:20px 40px;text-align:center;border-top:1px solid #e2e8e4;">
    <p style="margin:0;color:#6a7f72;font-size:12px;">© {$year} Salah Calendar by Hablullah</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>
HTML;
}

/* ══════════════════════════════════════════════════════════════
   Router
══════════════════════════════════════════════════════════════ */
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'register':        actionRegister();        break;
    case 'send-otp':        actionSendOTP();         break;
    case 'verify-otp':      actionVerifyOTP();       break;
    case 'get-calendar':    actionGetCalendar();     break;
    case 'update-calendar': actionUpdateCalendar();  break;
    default:
        jsonErr('Invalid action. Supported: register, send-otp, verify-otp, get-calendar, update-calendar');
}
