<?php
/**
 * Simple PHP backend for account management:
 * - Google OAuth login
 * - Microsoft OAuth login
 * - Email + OTP authentication
 * - MySQL storage
 *
 * NOTE:
 * This is a minimal reference implementation. Production systems
 * must include stronger security, logging, rate limiting,
 * CSRF protection, and secrets management.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/BrevoEmailService.php';

/* ==============================
   DATABASE CONNECTION
============================== */

class Database {
    private static $conn;

    public static function getConnection() {
        if (!self::$conn) {
            self::$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            if (self::$conn->connect_error) {
                die("DB connection failed");
            }
        }
        return self::$conn;
    }
}

/* ==============================
   USER MODEL
============================== */

class User {

    public static function findByEmail($email) {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public static function create($data) {
        $db = Database::getConnection();

        $stmt = $db->prepare("INSERT INTO users
        (email, name, city, country, phone, auth_provider)
        VALUES (?, ?, ?, ?, ?, ?)");

        $stmt->bind_param(
            "ssssss",
            $data['email'],
            $data['name'],
            $data['city'],
            $data['country'],
            $data['phone'],
            $data['auth_provider']
        );

        return $stmt->execute();
    }
}

/* ==============================
   EMAIL OTP SERVICE
============================== */

class OTPService {

    public static function generateCode() {
        return rand(100000, 999999);
    }

    public static function storeCode($email, $code) {
        $db = Database::getConnection();

        $expiry = date("Y-m-d H:i:s", time() + 300); // 5 minutes

        $stmt = $db->prepare("INSERT INTO email_otps (email, code, expiry)
        VALUES (?, ?, ?)");

        $stmt->bind_param("sss", $email, $code, $expiry);
        return $stmt->execute();
    }

    public static function verifyCode($email, $code) {
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM email_otps
        WHERE email=? AND code=? AND expiry > NOW()");

        $stmt->bind_param("ss", $email, $code);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc();
    }

    public static function sendEmail($email, $code) {
        $emailService = new BrevoEmailService(BREVO_API_KEY);

        $subject = "Your Salah Calendar Verification Code";
        $htmlBody = "
        <div style='font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:30px;'>
            <h2 style='color:#1B7A56;'>Verification Code</h2>
            <p>Your verification code is:</p>
            <div style='background:#eaf0e6;border-radius:10px;padding:20px;text-align:center;margin:20px 0;'>
                <span style='font-family:monospace;font-size:32px;font-weight:bold;color:#1B7A56;letter-spacing:6px;'>$code</span>
            </div>
            <p style='color:#666;font-size:13px;'>This code expires in 5 minutes.</p>
        </div>";

        return $emailService->sendEmail($email, $subject, $htmlBody);
    }
}

/* ==============================
   AUTH CONTROLLER
============================== */

class AuthController {

    /* EMAIL LOGIN STEP 1 */
    public static function sendOTP() {
        $email = $_POST['email'];

        $code = OTPService::generateCode();
        OTPService::storeCode($email, $code);
        OTPService::sendEmail($email, $code);

        echo json_encode(["status" => "OTP_SENT"]);
    }

    /* EMAIL LOGIN STEP 2 */
    public static function verifyOTP() {

        $email = $_POST['email'];
        $code = $_POST['code'];

        $otp = OTPService::verifyCode($email, $code);

        if (!$otp) {
            http_response_code(401);
            echo json_encode(["error" => "Invalid or expired code"]);
            return;
        }

        $user = User::findByEmail($email);

        if (!$user) {
            echo json_encode(["status" => "NEW_USER"]);
        } else {
            echo json_encode(["status" => "AUTHENTICATED"]);
        }
    }

    /* COMPLETE REGISTRATION */
    public static function register() {

        $data = [
            'email' => $_POST['email'],
            'name' => $_POST['name'],
            'city' => $_POST['city'],
            'country' => $_POST['country'],
            'phone' => $_POST['phone'],
            'auth_provider' => 'email'
        ];

        User::create($data);

        echo json_encode(["status" => "ACCOUNT_CREATED"]);
    }

    /* GOOGLE OAUTH (simplified) */
    public static function googleLogin() {

        $token = $_POST['token'];

        // Normally validate token with Google API
        // Example placeholder
        $googleUser = self::validateGoogleToken($token);

        self::oauthUser($googleUser, "google");
    }

    /* MICROSOFT OAUTH */
    public static function microsoftLogin() {

        $token = $_POST['token'];

        $msUser = self::validateMicrosoftToken($token);

        self::oauthUser($msUser, "microsoft");
    }

    private static function oauthUser($profile, $provider) {

        $user = User::findByEmail($profile['email']);

        if (!$user) {
            echo json_encode([
                "status" => "NEW_USER",
                "email" => $profile['email'],
                "provider" => $provider
            ]);
        } else {
            echo json_encode(["status" => "AUTHENTICATED"]);
        }
    }

    private static function validateGoogleToken($token) {
        // call Google endpoint in real implementation
        return ["email" => "user@example.com"];
    }

    private static function validateMicrosoftToken($token) {
        return ["email" => "user@example.com"];
    }
}

/* ==============================
   ROUTER
============================== */

$action = $_GET['action'] ?? '';

switch ($action) {

    case 'send-otp':
        AuthController::sendOTP();
        break;

    case 'verify-otp':
        AuthController::verifyOTP();
        break;

    case 'register':
        AuthController::register();
        break;

    case 'google':
        AuthController::googleLogin();
        break;

    case 'microsoft':
        AuthController::microsoftLogin();
        break;

    default:
        echo json_encode(["error" => "Invalid action"]);
}
