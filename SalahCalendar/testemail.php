<?php
// Include the service class
require_once 'BrevoEmailService.php';

// Configuration - Replace with your actual Brevo API key
$apiKey = 'YOUR_ACTUAL_BREVO_API_KEY_HERE'; 

$statusMessage = '';
$statusClass = '';

// Handle Form Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $to = filter_input(INPUT_POST, 'to', FILTER_VALIDATE_EMAIL);
    $subject = htmlspecialchars(trim($_POST['subject']));
    $body = trim($_POST['body']); // Keeping raw string to allow HTML tags

    if (!$to) {
        $statusMessage = "Invalid recipient email address.";
        $statusClass = "error";
    } else {
        // Instantiate the service
        $emailService = new BrevoEmailService($apiKey);
        
        // Execute the send
        $result = $emailService->sendEmail($to, $subject, $body);
        
        $statusMessage = $result['message'];
        $statusClass = $result['success'] ? 'success' : 'error';
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Brevo Email Service Test</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f6f9; padding: 40px; color: #333; }
        .container { max-width: 600px; background: #fff; padding: 30px; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h2 { margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;}
        .form-group { margin-bottom: 20px; }
        label { display: block; font-weight: bold; margin-bottom: 8px; color: #475569; }
        input[type="email"], input[type="text"], textarea { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; font-size: 14px; }
        textarea { height: 120px; resize: vertical; }
        button { background: #2563eb; color: #fff; border: none; padding: 12px 20px; font-size: 16px; border-radius: 4px; cursor: pointer; width: 100%; transition: background 0.2s; }
        button:hover { background: #1d4ed8; }
        .alert { padding: 12px; margin-bottom: 20px; border-radius: 4px; font-weight: bold; }
        .success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .error { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
        .domain-badge { font-size: 12px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #475569; }
    </style>
</head>
<body>

<div class="container">
    <h2>Brevo Mailer Test</h2>
    <p>Sender: <strong>contact@hablullah.app</strong> <span class="domain-badge">Verified Domain</span></p>

    <?php if (!empty($statusMessage)): ?>
        <div class="alert <?php echo $statusClass; ?>">
            <?php echo $statusMessage; ?>
        </div>
    <?php endif; ?>

    <form action="" method="POST">
        <div class="form-group">
            <label Lothar for="to">Recipient Email (To:)</label>
            <input type="email" id="to" name="to" placeholder="recipient@example.com" required value="<?php echo isset($_POST['to']) ? htmlspecialchars($_POST['to']) : ''; ?>">
        </div>

        <div class="form-group">
            <label for="subject">Subject</label>
            <input type="text" id="subject" name="subject" placeholder="Enter email subject" required value="<?php echo isset($_POST['subject']) ? htmlspecialchars($_POST['subject']) : ''; ?>">
        </div>

        <div class="form-group">
            <label for="body">Message Body (HTML Allowed)</label>
            <textarea id="body" name="body" placeholder="<h1>Hello World</h1><p>This is my test text.</p>" required><?php echo isset($_POST['body']) ? htmlspecialchars($_POST['body']) : ''; ?></textarea>
        </div>

        <button type="submit">Send Test Email</button>
    </form>
</div>

</body>
</html>