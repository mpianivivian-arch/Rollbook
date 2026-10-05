<?php
// rollbook/api/invoices.php
require_once __DIR__ . '/db.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

if ($method === 'POST') {
    $action = $input['action'] ?? 'create';

    if ($action === 'delete') {
        $id = $input['id'] ?? null;
        if (!$id) {
            jsonResponse(['success' => false, 'error' => 'Invoice ID is required.'], 400);
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM invoices WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(['success' => true, 'message' => 'Invoice deleted.']);
        } catch (Exception $e) {
            jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // Create Invoice
    $studentId = $input['student_id'] ?? ($input['studentId'] ?? null);
    $desc = trim($input['description'] ?? ($input['desc'] ?? ''));
    $amount = (float)($input['amount'] ?? 0);
    $due = !empty($input['due_date']) ? $input['due_date'] : (!empty($input['due']) ? $input['due'] : null);
    $date = !empty($input['inv_date']) ? $input['inv_date'] : (!empty($input['date']) ? $input['date'] : date('Y-m-d'));

    if (!$studentId || !$desc || $amount <= 0) {
        jsonResponse(['success' => false, 'error' => 'Student ID, description, and positive amount are required.'], 400);
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO invoices (student_id, description, amount, due_date, inv_date) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$studentId, $desc, $amount, $due, $date]);
        $newId = (string)$pdo->lastInsertId();

        jsonResponse([
            'success' => true,
            'message' => 'Invoice created.',
            'data'    => [
                'id'        => $newId,
                'studentId' => (string)$studentId,
                'desc'      => $desc,
                'amount'    => $amount,
                'due'       => $due ?? '',
                'date'      => $date
            ]
        ]);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? ($input['id'] ?? null);
    if (!$id) {
        jsonResponse(['success' => false, 'error' => 'Invoice ID is required.'], 400);
    }
    try {
        $stmt = $pdo->prepare("DELETE FROM invoices WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'Invoice deleted.']);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
