<?php

class BrevoEmailService {
    private $apiKey;
    private $senderEmail;
    private $senderName;
    private $apiUrl = "https://api.brevo.com/v3/smtp/email";

    public function __construct($apiKey, $senderEmail = 'contact@hablullah.app', $senderName = 'Hablullah Support') {
        $this->apiKey = $apiKey;
        $this->senderEmail = $senderEmail;
        $this->senderName = $senderName;
    }

    /**
     * Sends an HTML email via Brevo API
     * * @param string $toEmail Recipient email address
     * @param string $subject Email subject line
     * @param string $htmlBody HTML content of the email
     * @param string $toName Optional recipient name
     * @return array Array containing 'success' (bool) and 'message' (string)
     */
    public function sendEmail($toEmail, $subject, $htmlBody, $toName = '') {
        // Validate inputs
        if (empty($toEmail) || empty($subject) || empty($htmlBody)) {
            return ['success' => false, 'message' => 'Missing required fields (To, Subject, or Body).'];
        }

        // Prepare Payload
        $payload = [
            "sender" => [
                "name" => $this->senderName,
                "email" => $this->senderEmail
            ],
            "to" => [
                [
                    "email" => $toEmail,
                    "name" => $toName ?: $toEmail // Fallback to email if name isn't provided
                ]
            ],
            "subject" => $subject,
            "htmlContent" => $htmlBody
        ];

        // Initialize cURL
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->apiUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => [
                "accept: application/json",
                "api-key: " . $this->apiKey,
                "content-type: application/json"
            ],
            CURLOPT_TIMEOUT => 30
        ]);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            return ['success' => false, 'message' => 'cURL Error: ' . $err];
        }

        $result = json_decode($response, true);

        if (isset($result['messageId'])) {
            return ['success' => true, 'message' => 'Email sent successfully! ID: ' . $result['messageId']];
        } else {
            // Capture Brevo API error messages if available
            $errorMsg = isset($result['message']) ? $result['message'] : $response;
            return ['success' => false, 'message' => 'Brevo Error: ' . $errorMsg];
        }
    }
}