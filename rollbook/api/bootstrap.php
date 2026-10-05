<?php
// rollbook/api/bootstrap.php
require_once __DIR__ . '/db.php';

$pdo = getDB();

try {
    // 1. Fetch all students
    $stmt = $pdo->query("SELECT id, admno, name, cls, gender, father, father_phone, mother, mother_phone, guardian, guardian_phone, email FROM students ORDER BY name ASC");
    $studentsRaw = $stmt->fetchAll();
    $students = [];
    foreach ($studentsRaw as $row) {
        $students[] = [
            'id'            => (string)$row['id'],
            'admno'         => $row['admno'],
            'name'          => $row['name'],
            'cls'           => $row['cls'],
            'gender'        => $row['gender'] ?? 'Female',
            'father'        => $row['father'] ?? '',
            'fatherPhone'   => $row['father_phone'] ?? '',
            'mother'        => $row['mother'] ?? '',
            'motherPhone'   => $row['mother_phone'] ?? '',
            'guardian'      => $row['guardian'] ?? '',
            'guardianPhone' => $row['guardian_phone'] ?? '',
            'email'         => $row['email'] ?? '',
        ];
    }

    // 2. Fetch all attendance
    $stmtAtt = $pdo->query("SELECT student_id, att_date, status FROM attendance ORDER BY att_date ASC");
    $attRaw = $stmtAtt->fetchAll();
    $attendance = [];
    foreach ($attRaw as $row) {
        $dateStr = $row['att_date'];
        $sid = (string)$row['student_id'];
        if (!isset($attendance[$dateStr])) {
            $attendance[$dateStr] = [];
        }
        $attendance[$dateStr][$sid] = $row['status'];
    }

    // 3. Fetch all invoices
    $stmtInv = $pdo->query("SELECT id, student_id, description, amount, due_date, COALESCE(inv_date, DATE(created_at)) as inv_date FROM invoices ORDER BY id ASC");
    $invRaw = $stmtInv->fetchAll();

    // 4. Fetch all payments
    $stmtPay = $pdo->query("SELECT id, student_id, amount, method, note, COALESCE(pay_date, DATE(created_at)) as pay_date FROM payments ORDER BY id ASC");
    $payRaw = $stmtPay->fetchAll();

    $fees = [];
    foreach ($students as $s) {
        $fees[$s['id']] = [
            'invoices' => [],
            'payments' => []
        ];
    }

    foreach ($invRaw as $inv) {
        $sid = (string)$inv['student_id'];
        if (!isset($fees[$sid])) {
            $fees[$sid] = ['invoices' => [], 'payments' => []];
        }
        $fees[$sid]['invoices'][] = [
            'id'     => (string)$inv['id'],
            'desc'   => $inv['description'],
            'amount' => (float)$inv['amount'],
            'due'    => $inv['due_date'] ?? '',
            'date'   => $inv['inv_date'] ?? date('Y-m-d')
        ];
    }

    foreach ($payRaw as $pay) {
        $sid = (string)$pay['student_id'];
        if (!isset($fees[$sid])) {
            $fees[$sid] = ['invoices' => [], 'payments' => []];
        }
        $fees[$sid]['payments'][] = [
            'id'     => (string)$pay['id'],
            'amount' => (float)$pay['amount'],
            'method' => $pay['method'] ?? 'Cash',
            'note'   => $pay['note'] ?? '',
            'date'   => $pay['pay_date'] ?? date('Y-m-d')
        ];
    }

    // 5. Fetch settings
    $stmtSet = $pdo->query("SELECT setting_key, setting_value FROM settings");
    $setRaw = $stmtSet->fetchAll();
    $settings = [];
    foreach ($setRaw as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    $currency = $settings['currency'] ?? 'GHS';

    jsonResponse([
        'success' => true,
        'data' => [
            'students'   => $students,
            'attendance' => $attendance,
            'fees'       => $fees,
            'currency'   => $currency,
        ]
    ]);
} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'error'   => $e->getMessage()
    ], 500);
}
