<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include 'db.php';

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get_all_numbers':
            // Get all invoice numbers
            $stmt = $pdo->prepare("SELECT invoice_no, invoice_date, customer_name FROM invoices ORDER BY CAST(invoice_no AS UNSIGNED) DESC");
            $stmt->execute();
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'invoices' => $invoices
            ]);
            break;
            
        case 'get_by_number':
            // Get invoice by invoice number
            $invoice_no = $_GET['invoice_no'] ?? '';
            if (empty($invoice_no)) {
                throw new Exception('Invoice number is required');
            }
            
            // Get invoice header
            $stmt = $pdo->prepare("SELECT * FROM invoices WHERE invoice_no = ?");
            $stmt->execute([$invoice_no]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$invoice) {
                throw new Exception('Invoice not found');
            }
            
            // Get invoice items
            $stmt_items = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_no = ? ORDER BY s_no ASC");
            $stmt_items->execute([$invoice_no]);
            $items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);
            
            // Get customer details if customer_name exists
            $customer = null;
            if (!empty($invoice['customer_name'])) {
                $stmt_customer = $pdo->prepare("SELECT * FROM customers WHERE customer_name = ?");
                $stmt_customer->execute([$invoice['customer_name']]);
                $customer = $stmt_customer->fetch(PDO::FETCH_ASSOC);
            }
            
            echo json_encode([
                'success' => true,
                'invoice' => $invoice,
                'items' => $items,
                'customer' => $customer
            ]);
            break;
            
        default:
            throw new Exception('Invalid action. Use get_all_numbers or get_by_number');
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
