<?php
header('Content-Type: application/json');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/BrevoEmailService.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

$email = trim($data['email'] ?? '');
$name = trim($data['name'] ?? 'User');
$phone = trim($data['phone'] ?? 'Not provided');
$country = trim($data['country'] ?? 'Not provided');
$type = trim($data['type'] ?? 'Other');
$subject = trim($data['subject'] ?? '');
$message = trim($data['message'] ?? '');

if (empty($email) || empty($subject) || empty($message)) {
    echo json_encode(['success' => false, 'message' => 'Email, subject, and message are mandatory.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
    exit;
}

// Build HTML email
$htmlContent = "
<h2>New Contact Request from Salah Calendar</h2>
<p><strong>Type:</strong> " . htmlspecialchars($type) . "</p>
<p><strong>Name:</strong> " . htmlspecialchars($name) . "</p>
<p><strong>Email:</strong> " . htmlspecialchars($email) . "</p>
<p><strong>Phone:</strong> " . htmlspecialchars($phone) . "</p>
<p><strong>Country:</strong> " . htmlspecialchars($country) . "</p>
<p><strong>Subject:</strong> " . htmlspecialchars($subject) . "</p>
<hr>
<h3>Message:</h3>
<p>" . nl2br(htmlspecialchars($message)) . "</p>
";

$brevo = new BrevoEmailService(BREVO_API_KEY, 'SalahCalendar@hablullah.app', $name);

$result = $brevo->sendEmail('contact@hablullah.app', "[$type] $subject", $htmlContent, 'Hablullah Support');

if ($result['success']) {
    echo json_encode(['success' => true, 'message' => 'email sent - you will hear from the Habullah team soon InshaAllah']);
} else {
    echo json_encode(['success' => false, 'message' => $result['message']]);
}
