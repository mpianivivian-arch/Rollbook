<?php
// rollbook/api/payments.php
require_once __DIR__ . '/db.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

if ($method === 'POST') {
    $action = $input['action'] ?? 'record';

    if ($action === 'delete') {
        $id = $input['id'] ?? null;
        if (!$id) {
            jsonResponse(['success' => false, 'error' => 'Payment ID is required.'], 400);
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM payments WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(['success' => true, 'message' => 'Payment deleted.']);
        } catch (Exception $e) {
            jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // Record Payment
    $studentId = $input['student_id'] ?? ($input['studentId'] ?? null);
    $amount = (float)($input['amount'] ?? 0);
    $methodType = trim($input['method'] ?? 'Cash');
    $note = trim($input['note'] ?? '');
    $date = !empty($input['pay_date']) ? $input['pay_date'] : (!empty($input['date']) ? $input['date'] : date('Y-m-d'));

    if (!$studentId || $amount <= 0) {
        jsonResponse(['success' => false, 'error' => 'Student ID and positive amount are required.'], 400);
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO payments (student_id, amount, method, note, pay_date) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$studentId, $amount, $methodType, $note, $date]);
        $newId = (string)$pdo->lastInsertId();

        jsonResponse([
            'success' => true,
            'message' => 'Payment recorded.',
            'data'    => [
                'id'        => $newId,
                'studentId' => (string)$studentId,
                'amount'    => $amount,
                'method'    => $methodType,
                'note'      => $note,
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
        jsonResponse(['success' => false, 'error' => 'Payment ID is required.'], 400);
    }
    try {
        $stmt = $pdo->prepare("DELETE FROM payments WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'Payment deleted.']);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
