<?php
// rollbook/api/attendance.php
require_once __DIR__ . '/db.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

if ($method === 'GET') {
    try {
        $date = $_GET['date'] ?? null;
        if ($date) {
            $stmt = $pdo->prepare("SELECT student_id, att_date, status FROM attendance WHERE att_date = ?");
            $stmt->execute([$date]);
        } else {
            $stmt = $pdo->query("SELECT student_id, att_date, status FROM attendance ORDER BY att_date ASC");
        }
        $rows = $stmt->fetchAll();
        $attendance = [];
        foreach ($rows as $row) {
            $d = $row['att_date'];
            $sid = (string)$row['student_id'];
            if (!isset($attendance[$d])) {
                $attendance[$d] = [];
            }
            $attendance[$d][$sid] = $row['status'];
        }
        jsonResponse(['success' => true, 'data' => $attendance]);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'POST') {
    $date = trim($input['date'] ?? '');
    $records = $input['records'] ?? [];

    if (!$date) {
        jsonResponse(['success' => false, 'error' => 'Date is required.'], 400);
    }

    if (!is_array($records)) {
        jsonResponse(['success' => false, 'error' => 'Invalid attendance records payload.'], 400);
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("INSERT INTO attendance (student_id, att_date, status) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE status = VALUES(status)");

        foreach ($records as $studentId => $status) {
            if (in_array($status, ['present', 'absent', 'late'], true)) {
                $stmt->execute([$studentId, $date, $status]);
            }
        }

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'message' => 'Attendance saved successfully.',
            'date'    => $date,
            'records' => $records
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
