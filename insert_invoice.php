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
    
    // Insert into invoices table with summary fields
    $stmt = $pdo->prepare("INSERT INTO invoices (invoice_no, invoice_date, customer_name, customer_gstin, customer_address1, customer_address2, amount_before_tax, discount_type, discount_value, discount_amount, amount_after_discount, total_tax, total_after_tax) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $data['invoice_no'],
        $data['invoice_date'],
        $data['customer_name'],
        $data['customer_gstin'],
        $data['customer_address1'] ?? '',
        $data['customer_address2'] ?? '',
        $data['amount_before_tax'] ?? 0,
        $data['discount_type'] ?? 'fixed',
        $data['discount_value'] ?? 0,
        $data['discount_amount'] ?? 0,
        $data['amount_after_discount'] ?? $data['amount_before_tax'] ?? 0,
        $data['total_tax'] ?? 0,
        $data['total_after_tax'] ?? 0
    ]);
    
    $invoice_id = $pdo->lastInsertId();
    
    // Save PDF to server if provided
    if (isset($data['pdf_base64']) && !empty($data['pdf_base64'])) {
        $bills_directory = "C:\\Users\\sadik\\OneDrive\\Desktop\\invoice-main\\BILLS";
        
        // Create directory if it doesn't exist
        if (!is_dir($bills_directory)) {
            mkdir($bills_directory, 0777, true);
        }
        
        $customer_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $data['customer_name']);
        $pdf_filename = "{$data['invoice_no']}_{$customer_name}.pdf";
        $pdf_path = $bills_directory . DIRECTORY_SEPARATOR . $pdf_filename;
        
        // Decode and save PDF
        $pdf_content = base64_decode($data['pdf_base64']);
        if (file_put_contents($pdf_path, $pdf_content) === false) {
            throw new Exception("Failed to save PDF to: " . $pdf_path);
        }
    }
    
    // Insert invoice items with invoice_no and serial number (s_no) - InfinityFree compatible
    $stmt_item = $pdo->prepare("INSERT INTO invoice_items (invoice_no, s_no, item_name, gst_rate, quantity, rate, amount, cgst, sgst, igst, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $s_no = 1; // Initialize serial number
    foreach ($data['items'] as $item) {
        $stmt_item->execute([
            $data['invoice_no'],      // Invoice number (link to invoice)
            $s_no,                    // Serial number
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
        $s_no++; // Increment serial number for next item
    }
    
    $pdo->commit();
    echo json_encode(["success" => true, "invoice_id" => $invoice_id, "invoice_no" => $data['invoice_no']]);
    
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