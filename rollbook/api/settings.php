<?php
// rollbook/api/settings.php
require_once __DIR__ . '/db.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
        $settings = [];
        while ($row = $stmt->fetch()) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        jsonResponse(['success' => true, 'data' => $settings]);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'POST') {
    $key = trim($input['key'] ?? ($input['setting_key'] ?? ''));
    $value = trim($input['value'] ?? ($input['setting_value'] ?? ''));

    if (!$key) {
        jsonResponse(['success' => false, 'error' => 'Setting key is required.'], 400);
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        $stmt->execute([$key, $value]);
        jsonResponse(['success' => true, 'message' => 'Setting saved.', 'data' => ['key' => $key, 'value' => $value]]);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
