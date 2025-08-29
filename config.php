<?php
// Load environment variables from .env file
function load_env() {
    $env_file = __DIR__ . '/.env';
    if (!file_exists($env_file)) {
        error_log('Environment file not found: ' . $env_file);
        return false;
    }

    $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value, " \t\n\r\0\x0B\"'"); // Strip quotes and whitespace
        
        if (!empty($name)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
        }
    }
    return true;
}
