<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
        case 'get_all':
            // Get all customers
            $stmt = $pdo->prepare("SELECT * FROM customers ORDER BY customer_name ASC");
            $stmt->execute();
            $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'customers' => $customers
            ]);
            break;
            
        case 'get_by_name':
            // Get customer by name
            $name = $_GET['name'] ?? '';
            if (empty($name)) {
                throw new Exception('Customer name is required');
            }
            
            $stmt = $pdo->prepare("SELECT * FROM customers WHERE customer_name = ?");
            $stmt->execute([$name]);
            $customer = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($customer) {
                echo json_encode([
                    'success' => true,
                    'customer' => $customer
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Customer not found'
                ]);
            }
            break;
            
        case 'add':
            // Add new customer
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('POST method required for adding customers');
            }
            
            $data = json_decode(file_get_contents("php://input"), true);
            if (!$data || empty($data['customer_name'])) {
                throw new Exception('Customer name is required');
            }
            
            $stmt = $pdo->prepare("INSERT INTO customers (customer_name, address_line1, address_line2, address_line3, gstin) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE address_line1 = VALUES(address_line1), address_line2 = VALUES(address_line2), address_line3 = VALUES(address_line3), gstin = VALUES(gstin)");
            
            $stmt->execute([
                $data['customer_name'],
                $data['address_line1'] ?? '',
                $data['address_line2'] ?? '',
                $data['address_line3'] ?? '',
                $data['gstin'] ?? ''
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Customer saved successfully',
                'customer_id' => $pdo->lastInsertId()
            ]);
            break;
            
        default:
            throw new Exception('Invalid action');
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