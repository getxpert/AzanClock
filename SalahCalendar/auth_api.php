<?php

/* ── Session & Token Helpers ─────────────────────────────────── */

function generateToken($length = 64) {
    return bin2hex(random_bytes($length));
}

function validateSession() {
    $token = isset($_POST['session_token']) ? trim($_POST['session_token']) :
             (isset($_GET['session_token']) ? trim($_GET['session_token']) : '');
    if ($token === '') return null;

    $db = getDB();
    $stmt = $db->prepare(
        'SELECT us.user_id, us.email, u.name, us.expires_at
         FROM user_sessions us
         JOIN users u ON u.id = us.user_id
         WHERE us.session_token = ? AND us.expires_at > NOW()'
    );
    $stmt->execute([$token]);
    return $stmt->fetch();
}

function createSession($userId, $email) {
    $db = getDB();
    $token = generateToken();
    $expiresAt = date('Y-m-d H:i:s', time() + 86400); // 24 hours

    $stmt = $db->prepare(
        'INSERT INTO user_sessions (user_id, session_token, email, expires_at)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $token, $email, $expiresAt]);

    return ['token' => $token, 'expires_at' => $expiresAt];
}

/* ══════════════════════════════════════════════════════════════
   ACTION: send-login-otp
   Sends OTP to an email address for standalone login
══════════════════════════════════════════════════════════════ */
function actionSendLoginOTP() {
    $email = requirePost('email');

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonErr('Please provide a valid email address.');
    }

    $db = getDB();

    // Generate OTP (6 digits)
    $code   = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
    $expiry = date('Y-m-d H:i:s', time() + 100); // 100 seconds

    $stmt = $db->prepare('INSERT INTO email_otps (email, code, expiry) VALUES (?, ?, ?)');
    $stmt->execute([$email, $code, $expiry]);

    // Check if user already exists
    $stmt = $db->prepare('SELECT id, name FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Send OTP email
    $emailService = new BrevoEmailService(BREVO_API_KEY);
    $htmlBody = buildOTPEmailHTML($code, $user ? ($user['name'] ?: '') : '');
    $emailService->sendEmail($email, 'Your Salah Calendar Verification Code', $htmlBody, $user ? ($user['name'] ?: '') : '');

    jsonOK([
        'user_exists'  => (bool)$user,
        'masked_email' => maskEmail($email),
    ]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: verify-login-otp
   Verifies standalone login OTP and creates session
══════════════════════════════════════════════════════════════ */
function actionVerifyLoginOTP() {
    $email = requirePost('email');
    $code  = requirePost('code');

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonErr('Please provide a valid email address.');
    }

    $db = getDB();

    // Verify OTP
    $stmt = $db->prepare(
        'SELECT id FROM email_otps
         WHERE email = ? AND code = ? AND expiry > NOW()
         ORDER BY created_at DESC LIMIT 1'
    );
    $stmt->execute([$email, $code]);
    $otp = $stmt->fetch();

    if (!$otp) {
        jsonErr('Invalid or expired verification code.', 401);
    }

    // Delete used OTP
    $stmt = $db->prepare('DELETE FROM email_otps WHERE id = ?');
    $stmt->execute([$otp['id']]);

    // Find or create user
    $stmt = $db->prepare('SELECT id, email, name FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    $status = 'AUTHENTICATED';

    if (!$user) {
        // Create new user
        $stmt = $db->prepare(
            'INSERT INTO users (email, auth_provider) VALUES (?, ?)'
        );
        $stmt->execute([$email, 'email']);
        $userId = $db->lastInsertId();
        $userName = '';
        $status = 'NEW_USER';
    } else {
        $userId   = $user['id'];
        $userName = $user['name'] ?: '';
    }

    // Create session
    $session = createSession($userId, $email);

    // Count user's calendars
    $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM salah_calendars WHERE user_id = ?');
    $stmt->execute([$userId]);
    $calendarCount = (int)$stmt->fetch()['cnt'];

    jsonOK([
        'status'  => $status,
        'session' => $session,
        'user'    => [
            'email' => $email,
            'name'  => $userName,
        ],
        'calendar_count' => $calendarCount,
    ]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: send-magic-link
   Sends a magic-link email for one-click sign-in
══════════════════════════════════════════════════════════════ */
function actionSendMagicLink() {
    $email = requirePost('email');

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonErr('Please provide a valid email address.');
    }

    $db = getDB();

    // Generate token
    $token  = generateToken();
    $expiry = date('Y-m-d H:i:s', time() + 86400); // 24 hours

    $stmt = $db->prepare(
        'INSERT INTO magic_links (email, token, expiry) VALUES (?, ?, ?)'
    );
    $stmt->execute([$email, $token, $expiry]);

    // Build magic link URL
    $link = APP_BASE_URL . '/?token=' . $token;

    // Look up user name for email personalisation
    $stmt = $db->prepare('SELECT name FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    $name = $user ? ($user['name'] ?: '') : '';

    // Send email
    $emailService = new BrevoEmailService(BREVO_API_KEY);
    $htmlBody = buildMagicLinkEmailHTML($link, $name);
    $emailService->sendEmail($email, 'Sign In to Salah Calendar', $htmlBody, $name);

    jsonOK([
        'masked_email' => maskEmail($email),
    ]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: verify-magic-link
   Verifies magic-link token and creates session
══════════════════════════════════════════════════════════════ */
function actionVerifyMagicLink() {
    $token = isset($_GET['token']) ? trim($_GET['token']) : '';
    if ($token === '') jsonErr('Missing magic link token.');

    $db = getDB();

    // Look up token
    $stmt = $db->prepare(
        'SELECT id, email FROM magic_links
         WHERE token = ? AND expiry > NOW() AND used = 0
         LIMIT 1'
    );
    $stmt->execute([$token]);
    $link = $stmt->fetch();

    if (!$link) {
        jsonErr('Invalid or expired magic link.', 401);
    }

    // Mark as used
    $stmt = $db->prepare('UPDATE magic_links SET used = 1 WHERE id = ?');
    $stmt->execute([$link['id']]);

    $email = $link['email'];

    // Find or create user
    $stmt = $db->prepare('SELECT id, email, name FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        $stmt = $db->prepare(
            'INSERT INTO users (email, auth_provider) VALUES (?, ?)'
        );
        $stmt->execute([$email, 'email']);
        $userId   = $db->lastInsertId();
        $userName = '';
    } else {
        $userId   = $user['id'];
        $userName = $user['name'] ?: '';
    }

    // Create session
    $session = createSession($userId, $email);

    // Count user's calendars
    $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM salah_calendars WHERE user_id = ?');
    $stmt->execute([$userId]);
    $calendarCount = (int)$stmt->fetch()['cnt'];

    jsonOK([
        'session' => $session,
        'user'    => [
            'email' => $email,
            'name'  => $userName,
        ],
        'calendar_count' => $calendarCount,
    ]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: check-session
   Validates a session token and returns user info
══════════════════════════════════════════════════════════════ */
function actionCheckSession() {
    $session = validateSession();

    if (!$session) {
        jsonErr('Session expired or invalid.', 401);
    }

    $db = getDB();

    // Count user's calendars
    $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM salah_calendars WHERE user_id = ?');
    $stmt->execute([$session['user_id']]);
    $calendarCount = (int)$stmt->fetch()['cnt'];

    jsonOK([
        'user' => [
            'email' => $session['email'],
            'name'  => $session['name'],
        ],
        'calendar_count' => $calendarCount,
    ]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: logout
   Destroys a session token
══════════════════════════════════════════════════════════════ */
function actionLogout() {
    $token = requirePost('session_token');

    $db = getDB();
    $stmt = $db->prepare('DELETE FROM user_sessions WHERE session_token = ?');
    $stmt->execute([$token]);

    jsonOK([]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: login-password
   Authenticates user with password and creates session
══════════════════════════════════════════════════════════════ */
function actionLoginPassword() {
    $email    = requirePost('email');
    $password = requirePost('password');

    $db = getDB();

    $stmt = $db->prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !$user['password_hash'] || !password_verify($password, $user['password_hash'])) {
        jsonErr('Invalid email or password.', 401);
    }

    $session = createSession($user['id'], $user['email']);

    $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM salah_calendars WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $calendarCount = (int)$stmt->fetch()['cnt'];

    jsonOK([
        'success' => true,
        'session' => $session,
        'user'    => [
            'email' => $user['email'],
            'name'  => $user['name'] ?: '',
        ],
        'calendar_count' => $calendarCount,
    ]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: signup-password
   Creates a new user with password and creates session
══════════════════════════════════════════════════════════════ */
function actionSignupPassword() {
    $email    = requirePost('email');
    $password = requirePost('password');
    $name     = optionalPost('name');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonErr('Please provide a valid email address.');
    }
    if (strlen($password) < 6) {
        jsonErr('Password must be at least 6 characters long.');
    }

    $db = getDB();

    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonErr('An account with this email already exists.');
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare(
        'INSERT INTO users (email, name, password_hash, auth_provider) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$email, $name, $hash, 'password']);
    $userId = $db->lastInsertId();

    $session = createSession($userId, $email);

    jsonOK([
        'success' => true,
        'session' => $session,
        'user'    => [
            'email' => $email,
            'name'  => $name,
        ],
        'calendar_count' => 0,
    ]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: forgot-password
   Sends a password reset link to the user's email
══════════════════════════════════════════════════════════════ */
function actionForgotPassword() {
    $email = requirePost('email');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonErr('Please provide a valid email address.');
    }

    $db = getDB();

    $stmt = $db->prepare('SELECT id, name FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $token  = generateToken();
        $expiry = date('Y-m-d H:i:s', time() + 3600); // 1 hour

        $stmt = $db->prepare(
            'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)'
        );
        $stmt->execute([$email, $token, $expiry]);

        $link = APP_BASE_URL . '/?reset_token=' . $token;

        $emailService = new BrevoEmailService(BREVO_API_KEY);
        $htmlBody = buildPasswordResetEmailHTML($link, $user['name'] ?: '');
        $emailService->sendEmail($email, 'Password Reset', $htmlBody, $user['name'] ?: '');
    }

    // Always return success to prevent email enumeration
    jsonOK(['success' => true]);
}

/* ══════════════════════════════════════════════════════════════
   ACTION: reset-password
   Resets the user's password using a valid token
══════════════════════════════════════════════════════════════ */
function actionResetPassword() {
    $token       = requirePost('token');
    $newPassword = requirePost('new_password');

    if (strlen($newPassword) < 6) {
        jsonErr('Password must be at least 6 characters long.');
    }

    $db = getDB();

    $stmt = $db->prepare(
        'SELECT id, email FROM password_resets
         WHERE token = ? AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1'
    );
    $stmt->execute([$token]);
    $reset = $stmt->fetch();

    if (!$reset) {
        jsonErr('Invalid or expired password reset token.', 401);
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $db->prepare('UPDATE users SET password_hash = ? WHERE email = ?');
    $stmt->execute([$hash, $reset['email']]);

    // Delete token (and any other tokens for this user)
    $stmt = $db->prepare('DELETE FROM password_resets WHERE email = ?');
    $stmt->execute([$reset['email']]);

    jsonOK(['success' => true]);
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
      This code expires in <strong>100 seconds</strong>. If you didn't request this code, please ignore this email.
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

function buildMagicLinkEmailHTML($link, $name) {
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
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">🔗 Sign In to Salah Calendar</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">One-Click Sign In</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 24px;color:#1a2b22;font-size:15px;line-height:1.6;">{$greeting}</p>
    <p style="margin:0 0 24px;color:#6a7f72;font-size:14px;line-height:1.6;">
      Click the button below to sign in to your Salah Calendar account. This link expires in 24 hours and can only be used once.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td align="center" style="padding:8px 0;">
        <a href="{$link}" style="display:inline-block;background:#1B7A56;color:#ffffff;font-size:16px;font-weight:600;padding:14px 36px;border-radius:8px;text-decoration:none;">🔗 Sign In Now</a>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;color:#6a7f72;font-size:13px;line-height:1.6;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 24px;background:#f8f9fa;border:1px solid #e2e8e4;border-radius:8px;padding:12px 16px;font-family:monospace;font-size:13px;color:#C08B18;word-break:break-all;">{$link}</p>
    <div style="background:#fff5f5;border:1px solid #fce0e0;border-radius:8px;padding:12px;margin-top:16px;">
      <p style="margin:0;color:#c94a3a;font-size:12px;">⚠️ If you didn't request this, please ignore this email.</p>
    </div>
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

function buildPasswordResetEmailHTML($link, $name) {
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
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">🔒 Reset Password</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Salah Calendar Account</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 24px;color:#1a2b22;font-size:15px;line-height:1.6;">{$greeting}</p>
    <p style="margin:0 0 24px;color:#6a7f72;font-size:14px;line-height:1.6;">
      We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td align="center" style="padding:8px 0;">
        <a href="{$link}" style="display:inline-block;background:#1B7A56;color:#ffffff;font-size:16px;font-weight:600;padding:14px 36px;border-radius:8px;text-decoration:none;">Reset Password</a>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;color:#6a7f72;font-size:13px;line-height:1.6;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 24px;background:#f8f9fa;border:1px solid #e2e8e4;border-radius:8px;padding:12px 16px;font-family:monospace;font-size:13px;color:#C08B18;word-break:break-all;">{$link}</p>
    <div style="background:#fff5f5;border:1px solid #fce0e0;border-radius:8px;padding:12px;margin-top:16px;">
      <p style="margin:0;color:#c94a3a;font-size:12px;">⚠️ If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
    </div>
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
