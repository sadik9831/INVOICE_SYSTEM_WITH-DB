<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

include 'db.php';

try {
    // Get the next invoice number
    $stmt = $pdo->prepare("SELECT MAX(CAST(invoice_no AS UNSIGNED)) as max_invoice FROM invoices");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $next_invoice_no = ($result['max_invoice'] ?? 0) + 1;
    
    // Get today's date
    $today_date = date('Y-m-d');
    
    echo json_encode([
        'success' => true,
        'next_invoice_no' => $next_invoice_no,
        'today_date' => $today_date
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>