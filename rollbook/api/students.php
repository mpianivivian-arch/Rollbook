<?php
// rollbook/api/students.php
require_once __DIR__ . '/db.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, admno, name, cls, gender, father, father_phone, mother, mother_phone, guardian, guardian_phone, email FROM students ORDER BY name ASC");
        $students = [];
        while ($row = $stmt->fetch()) {
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
        jsonResponse(['success' => true, 'data' => $students]);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'POST' || $method === 'PUT') {
    $action = $input['action'] ?? ($method === 'PUT' ? 'update' : 'save');

    if ($action === 'delete') {
        $id = $input['id'] ?? null;
        if (!$id) {
            jsonResponse(['success' => false, 'error' => 'Student ID is required.'], 400);
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM students WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(['success' => true, 'message' => 'Student deleted successfully.']);
        } catch (Exception $e) {
            jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    $id = !empty($input['id']) ? $input['id'] : null;
    $admno = trim($input['admno'] ?? '');
    $name = trim($input['name'] ?? '');
    $cls = trim($input['cls'] ?? '');
    $gender = trim($input['gender'] ?? 'Female');
    $father = trim($input['father'] ?? '');
    $fatherPhone = trim($input['fatherPhone'] ?? ($input['father_phone'] ?? ''));
    $mother = trim($input['mother'] ?? '');
    $motherPhone = trim($input['motherPhone'] ?? ($input['mother_phone'] ?? ''));
    $guardian = trim($input['guardian'] ?? '');
    $guardianPhone = trim($input['guardianPhone'] ?? ($input['guardian_phone'] ?? ''));
    $email = trim($input['email'] ?? '');

    if (!$admno || !$name || !$cls) {
        jsonResponse(['success' => false, 'error' => 'Admission number, name, and class are required.'], 400);
    }

    if (!$fatherPhone && !$motherPhone && !$guardianPhone) {
        jsonResponse(['success' => false, 'error' => 'At least one contact phone number is required.'], 400);
    }

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['success' => false, 'error' => 'A valid email address is required.'], 400);
    }

    // Check duplicate admission number
    if ($id) {
        $check = $pdo->prepare("SELECT id FROM students WHERE LOWER(admno) = LOWER(?) AND id != ?");
        $check->execute([$admno, $id]);
    } else {
        $check = $pdo->prepare("SELECT id FROM students WHERE LOWER(admno) = LOWER(?)");
        $check->execute([$admno]);
    }
    if ($check->fetch()) {
        jsonResponse(['success' => false, 'error' => 'That admission number is already in use.'], 400);
    }

    try {
        if ($id) {
            // Update
            $stmt = $pdo->prepare("UPDATE students SET 
                admno = ?, name = ?, cls = ?, gender = ?,
                father = ?, father_phone = ?, mother = ?, mother_phone = ?,
                guardian = ?, guardian_phone = ?, email = ?
                WHERE id = ?");
            $stmt->execute([
                $admno, $name, $cls, $gender,
                $father, $fatherPhone, $mother, $motherPhone,
                $guardian, $guardianPhone, $email, $id
            ]);
            $studentId = (string)$id;
        } else {
            // Insert
            $stmt = $pdo->prepare("INSERT INTO students 
                (admno, name, cls, gender, father, father_phone, mother, mother_phone, guardian, guardian_phone, email)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $admno, $name, $cls, $gender,
                $father, $fatherPhone, $mother, $motherPhone,
                $guardian, $guardianPhone, $email
            ]);
            $studentId = (string)$pdo->lastInsertId();
        }

        $student = [
            'id'            => $studentId,
            'admno'         => $admno,
            'name'          => $name,
            'cls'           => $cls,
            'gender'        => $gender,
            'father'        => $father,
            'fatherPhone'   => $fatherPhone,
            'mother'        => $mother,
            'motherPhone'   => $motherPhone,
            'guardian'      => $guardian,
            'guardianPhone' => $guardianPhone,
            'email'         => $email,
        ];

        jsonResponse([
            'success' => true,
            'data'    => $student,
            'message' => $id ? 'Student updated.' : 'Student registered.'
        ]);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? ($input['id'] ?? null);
    if (!$id) {
        jsonResponse(['success' => false, 'error' => 'Student ID is required.'], 400);
    }
    try {
        $stmt = $pdo->prepare("DELETE FROM students WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'Student deleted successfully.']);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
