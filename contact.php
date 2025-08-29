<?php
// contact.php: Receives JSON { name, email, inquiry } and sends email via SMTP using PHPMailer
// Responds with JSON: { ok: true } or { ok: false, error: '...' }

require_once __DIR__ . '/config.php';
if (!load_env()) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server configuration error']);
    exit;
}

header('Content-Type: application/json');
// Basic CORS support (helps during local dev or cross-origin production use)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
} else {
  header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// Allow only POST JSON
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
  exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
  exit;
}

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$inquiry = trim($data['inquiry'] ?? '');
$hp = isset($data['hp']) ? trim($data['hp']) : '';
$token = isset($data['token']) ? trim($data['token']) : '';

if ($name === '' || $email === '' || $inquiry === '') {
  http_response_code(422);
  echo json_encode(['ok' => false, 'error' => 'Missing fields']);
  exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'error' => 'Invalid email']);
  exit;
}
// Honeypot check
if ($hp !== '') {
  http_response_code(200);
  echo json_encode(['ok' => true]); // silently accept
  exit;
}

// Optional: Invisible reCAPTCHA v3/v2 verification if keys are configured
$recaptchaSecret = getenv('RECAPTCHA_SECRET');
if ($recaptchaSecret && $token) {
  $verify = @file_get_contents('https://www.google.com/recaptcha/api/siteverify?secret=' . urlencode($recaptchaSecret) . '&response=' . urlencode($token));
  $v = $verify ? json_decode($verify, true) : null;
  if (!$v || empty($v['success'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'reCAPTCHA failed']);
    exit;
  }
}

// Load PHPMailer (expecting vendor/autoload.php if using Composer). If not available, simple mail() fallback.
$useMailer = false;
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
  require __DIR__ . '/vendor/autoload.php';
  $useMailer = true;
}

$subject = 'Inquiry via orbatron.org';
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown IP';
$sentAt = date('Y-m-d H:i:s T');

$html = '<html><body style="font-family:monospace;">'
      . htmlspecialchars($name) . ' has sent you a message from '
      . htmlspecialchars($email) . '. They said:<br/><br/>'
      . '<em>"' . nl2br(htmlspecialchars($inquiry)) . '"</em><br/><br/>'
      . 'Sent on: ' . htmlspecialchars($sentAt) . ' from IP ' . htmlspecialchars($ip) . '. '
      . '</body></html>';

$toAddress = getenv('EMAIL_TO') ?: 'orb@orbatron.org';

// Debug log env vars
error_log("SMTP Config - Host: " . getenv('SMTP_HOST') . 
          ", Port: " . getenv('SMTP_PORT') . 
          ", User: " . getenv('SMTP_USER') . 
          ", From: " . getenv('SMTP_FROM') . 
          ", To: " . getenv('EMAIL_TO'));

if ($useMailer) {
  // Using PHPMailer with SMTP
  try {
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->SMTPDebug = 3; // Enable verbose debug output
    $mail->Debugoutput = function($str, $level) { error_log("PHPMailer: $str"); };
    $mail->isSMTP();
    $mail->Host = getenv('SMTP_HOST') ?: 'smtp.dreamhost.com';
    $mail->Port = (int)(getenv('SMTP_PORT') ?: 587);
    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->SMTPAuth = true;
    $smtpUser = getenv('SMTP_USER');
    $smtpPass = getenv('SMTP_PASS');
    if (!$smtpUser || !$smtpPass) {
        throw new Exception('SMTP credentials not found in environment');
    }
    $mail->Username = $smtpUser;
    $mail->Password = $smtpPass;

    $fromEmail = getenv('SMTP_FROM') ?: 'no-reply@orbatron.org';
    $mail->setFrom($fromEmail, 'orbatron.org');
    $mail->addAddress($toAddress);
    $mail->addReplyTo($email, $name);
    $mail->Subject = $subject;
    $mail->isHTML(true);
    $mail->Body = $html;
    $mail->AltBody = strip_tags($name . " has sent you a message from " . $email . ". They said:\n\n" . $inquiry . "\n\nSent on: " . $sentAt . " from IP " . $ip . ".");

    $mail->send();
    error_log('Email sent successfully to: ' . $toAddress . ' from: ' . $fromEmail);
    echo json_encode(['ok' => true, 'debug' => [
      'smtp_host' => $mail->Host,
      'smtp_port' => $mail->Port,
      'smtp_user' => $smtpUser,
      'from_email' => $fromEmail,
      'to_email' => $toAddress
    ]]);
    exit;
  } catch (Throwable $e) {
    http_response_code(500);
    error_log('SMTP Error: ' . $e->getMessage() . "\nTrace: " . $e->getTraceAsString());
    echo json_encode(['ok' => false, 'error' => 'SMTP error: ' . $e->getMessage()]);
    exit;
  }
} else {
  // Simple mail() fallback (server must be configured)
  $headers   = [];
  $headers[] = 'MIME-Version: 1.0';
  $headers[] = 'Content-type: text/html; charset=UTF-8';
  $fromEmail = getenv('SMTP_FROM') ?: 'no-reply@orbatron.org';
  $headers[] = 'From: orbatron.org <' . $fromEmail . '>';
  $headers[] = 'Reply-To: ' . $name . ' <' . $email . '>';
  $ok = @mail($toAddress, $subject, $html, implode("\r\n", $headers));
  if ($ok) {
    echo json_encode(['ok' => true]);
  } else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'mail() failed']);
  }
}


