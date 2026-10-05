<?php
// rollbook/api/db.php
header('Content-Type: application/json; charset=UTF-8');

// Error reporting for debugging (returns JSON on fatal errors)
error_reporting(E_ALL);
ini_set('display_errors', '0');

function getDB() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $host = '127.0.0.1';
    $dbname = 'rollbook';
    $user = 'root';
    $pass = '';
    $charset = 'utf8mb4';

    try {
        // First connect to MySQL server (without specifying DB in case it doesn't exist yet)
        $dsnInitial = "mysql:host={$host};charset={$charset}";
        $opt = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdoInit = new PDO($dsnInitial, $user, $pass, $opt);
        $pdoInit->exec("CREATE DATABASE IF NOT EXISTS `{$dbname}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        
        // Connect to the specific database
        $dsn = "mysql:host={$host};dbname={$dbname};charset={$charset}";
        $pdo = new PDO($dsn, $user, $pass, $opt);

        // Auto-initialize schema if needed
        ensureSchema($pdo);

        return $pdo;
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'error' => 'Database connection failed: ' . $e->getMessage()
        ], 500);
    }
}

function ensureSchema(PDO $pdo) {
    $schema = "
    CREATE TABLE IF NOT EXISTS `students` (
      `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
      `admno` varchar(50) NOT NULL,
      `name` varchar(150) NOT NULL,
      `cls` varchar(50) NOT NULL,
      `gender` enum('Female','Male','Other') NOT NULL DEFAULT 'Female',
      `father` varchar(150) DEFAULT NULL,
      `father_phone` varchar(30) DEFAULT NULL,
      `mother` varchar(150) DEFAULT NULL,
      `mother_phone` varchar(30) DEFAULT NULL,
      `guardian` varchar(150) DEFAULT NULL,
      `guardian_phone` varchar(30) DEFAULT NULL,
      `email` varchar(150) NOT NULL,
      `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `uq_students_admno` (`admno`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `attendance` (
      `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
      `student_id` int(10) unsigned NOT NULL,
      `att_date` date NOT NULL,
      `status` enum('present','absent','late') NOT NULL,
      `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `uq_attendance_student_date` (`student_id`,`att_date`),
      CONSTRAINT `fk_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `invoices` (
      `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
      `student_id` int(10) unsigned NOT NULL,
      `description` varchar(200) NOT NULL,
      `amount` decimal(10,2) NOT NULL,
      `due_date` date DEFAULT NULL,
      `inv_date` date DEFAULT NULL,
      `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `fk_invoices_student` (`student_id`),
      CONSTRAINT `fk_invoices_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `payments` (
      `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
      `student_id` int(10) unsigned NOT NULL,
      `amount` decimal(10,2) NOT NULL,
      `method` varchar(50) NOT NULL,
      `note` varchar(200) DEFAULT NULL,
      `pay_date` date DEFAULT NULL,
      `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `fk_payments_student` (`student_id`),
      CONSTRAINT `fk_payments_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `settings` (
      `setting_key` varchar(50) NOT NULL,
      `setting_value` varchar(200) NOT NULL,
      PRIMARY KEY (`setting_key`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($schema);

    // Ensure default currency
    $stmt = $pdo->prepare("INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES ('currency', 'GHS')");
    $stmt->execute();
}

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return $_POST;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
