<?php
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

// Log the received data for debugging
error_log("UPDATE INVOICE - Received data: " . print_r($data, true));

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "No data received"]);
    exit;
}

if (empty($data['invoice_no'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Invoice number is required for update"]);
    exit;
}

try {
    $pdo->beginTransaction();
    
    // Customer data is stored in invoices table, no need to duplicate in customers table on update
    // This prevents customer detail duplication issues
    
    // Update invoices table with summary fields
    $stmt = $pdo->prepare("UPDATE invoices SET 
        invoice_date = ?, 
        customer_name = ?, 
        customer_gstin = ?, 
        customer_address1 = ?, 
        customer_address2 = ?, 
        amount_before_tax = ?, 
        discount_type = ?, 
        discount_value = ?, 
        discount_amount = ?, 
        amount_after_discount = ?, 
        total_tax = ?, 
        total_after_tax = ? 
        WHERE invoice_no = ?");
    
    $stmt->execute([
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
        $data['total_after_tax'] ?? 0,
        $data['invoice_no']
    ]);
    
    $rowsAffected = $stmt->rowCount();
    error_log("UPDATE INVOICE - Rows affected in invoices table: " . $rowsAffected);
    
    if ($rowsAffected === 0) {
        // Check if invoice exists - select all columns to find primary key
        $check_stmt = $pdo->prepare("SELECT * FROM invoices WHERE invoice_no = ?");
        $check_stmt->execute([$data['invoice_no']]);
        if (!$check_stmt->fetch()) {
            throw new Exception("Invoice #{$data['invoice_no']} not found in database");
        }
        // If invoice exists but no rows affected, it means data is identical
        error_log("UPDATE INVOICE - Invoice exists but no changes detected");
    }
    
    // Delete old items
    $stmt_delete = $pdo->prepare("DELETE FROM invoice_items WHERE invoice_no = ?");
    $stmt_delete->execute([$data['invoice_no']]);
    error_log("UPDATE INVOICE - Deleted old items, rows affected: " . $stmt_delete->rowCount());
    
    // Insert updated items (InfinityFree compatible - no invoice_id)
    $stmt_item = $pdo->prepare("INSERT INTO invoice_items (invoice_no, s_no, item_name, gst_rate, quantity, rate, amount, cgst, sgst, igst, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $s_no = 1;
    $itemsInserted = 0;
    foreach ($data['items'] as $item) {
        $stmt_item->execute([
            $data['invoice_no'],
            $s_no,
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
        $itemsInserted++;
        $s_no++;
    }
    
    error_log("UPDATE INVOICE - Inserted {$itemsInserted} items");
    
    // Update PDF if provided
    if (isset($data['pdf_base64']) && !empty($data['pdf_base64'])) {
        $bills_directory = "C:\\Users\\sadik\\OneDrive\\Desktop\\invoice-main\\BILLS";
        
        if (!is_dir($bills_directory)) {
            mkdir($bills_directory, 0777, true);
        }
        
        $customer_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $data['customer_name']);
        $pdf_filename = "{$data['invoice_no']}_{$customer_name}.pdf";
        $pdf_path = $bills_directory . DIRECTORY_SEPARATOR . $pdf_filename;
        
        $pdf_content = base64_decode($data['pdf_base64']);
        if (file_put_contents($pdf_path, $pdf_content) === false) {
            throw new Exception("Failed to save PDF to: " . $pdf_path);
        }
    }
    
    $pdo->commit();
    error_log("UPDATE INVOICE - Transaction committed successfully for invoice #{$data['invoice_no']}");
    echo json_encode(["success" => true, "invoice_no" => $data['invoice_no'], "message" => "Invoice updated successfully", "items_updated" => $itemsInserted]);
    
} catch (PDOException $e) {
    $pdo->rollback();
    error_log("UPDATE INVOICE - PDO Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
} catch (Exception $e) {
    $pdo->rollback();
    error_log("UPDATE INVOICE - Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
