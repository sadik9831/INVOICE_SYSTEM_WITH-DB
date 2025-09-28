<?php
// Simple CORS fix for development - allows any origin
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
    exit;
}

include 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "No data received"]);
    exit;
}

try {
    $pdo->beginTransaction();
    
    $stmt = $pdo->prepare("INSERT INTO invoices (invoice_no, invoice_date, customer_name, customer_gstin, amount_before_tax, total_tax, total_after_tax) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $data['invoice_no'],
        $data['invoice_date'],
        $data['customer_name'],
        $data['customer_gstin'],
        $data['amount_before_tax'],
        $data['total_tax'],
        $data['total_after_tax']
    ]);
    
    $invoice_id = $pdo->lastInsertId();
    
    $stmt_item = $pdo->prepare("INSERT INTO invoice_items (invoice_id, item_name, gst_rate, quantity, rate, amount, cgst, sgst, igst, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($data['items'] as $item) {
        $stmt_item->execute([
            $invoice_id,
            $item['name'],
            $item['gst_rate'],
            $item['qty'],
            $item['rate'],
            $item['amount'],
            $item['cgst'],
            $item['sgst'],
            $item['igst'],
            $item['total']
        ]);
    }
    
    $pdo->commit();
    echo json_encode(["success" => true, "invoice_id" => $invoice_id]);
    
} catch (PDOException $e) {
    $pdo->rollback();
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollback();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>