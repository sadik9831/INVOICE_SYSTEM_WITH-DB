<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include 'db.php';

$action = $_GET['action'] ?? '';

function resolveCustomerColumns(PDO $pdo): array {
    $stmt = $pdo->query("DESCRIBE customers");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $cols = array_map(function ($r) { return $r['Field']; }, $rows);

    $pick = function(array $candidates) use ($cols) {
        foreach ($candidates as $c) {
            if (in_array($c, $cols, true)) return $c;
        }
        return null;
    };

    $nameCol = $pick(['customer_name', 'name', 'customer', 'party_name', 'client_name']);
    $addr1Col = $pick(['address_line1', 'customer_address1', 'address1', 'address_line', 'address']);
    $addr2Col = $pick(['address_line2', 'customer_address2', 'address2']);
    $addr3Col = $pick(['address_line3', 'customer_address3', 'address3']);
    $gstinCol = $pick(['gstin', 'customer_gstin', 'gst_no', 'gstin_no', 'gst_number']);

    // Customer name is mandatory, other fields are optional and handled dynamically.
    if (!$nameCol) {
        throw new Exception('Customers table must contain a customer name column');
    }

    return [
        'name' => $nameCol,
        'addr1' => $addr1Col,
        'addr2' => $addr2Col,
        'addr3' => $addr3Col,
        'gstin' => $gstinCol
    ];
}

function selectExprOrEmpty(?string $column, string $alias): string {
    if ($column) {
        return "{$column} AS {$alias}";
    }
    return "'' AS {$alias}";
}

try {
    $cols = resolveCustomerColumns($pdo);
    
    // Ensure UNIQUE constraint on customer_name to prevent duplicates at database level
    try {
        $pdo->exec("ALTER TABLE customers ADD UNIQUE KEY unique_customer_name ({$cols['name']})");
    } catch (PDOException $e) {
        // Constraint might already exist, ignore error
        if (strpos($e->getMessage(), 'Duplicate key name') === false && strpos($e->getMessage(), 'already exists') === false) {
            // Only log if it's not a "already exists" error
        }
    }

    switch ($action) {
        case 'get_all':
            // Return normalized field names for frontend consistency.
            $stmt = $pdo->prepare(
                "SELECT {$cols['name']} AS customer_name,
                        " . selectExprOrEmpty($cols['addr1'], 'address_line1') . ",
                        " . selectExprOrEmpty($cols['addr2'], 'address_line2') . ",
                        " . selectExprOrEmpty($cols['addr3'], 'address_line3') . ",
                        " . selectExprOrEmpty($cols['gstin'], 'gstin') . "
                 FROM customers
                 ORDER BY {$cols['name']} ASC"
            );
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
            
            $stmt = $pdo->prepare(
                "SELECT {$cols['name']} AS customer_name,
                    " . selectExprOrEmpty($cols['addr1'], 'address_line1') . ",
                    " . selectExprOrEmpty($cols['addr2'], 'address_line2') . ",
                    " . selectExprOrEmpty($cols['addr3'], 'address_line3') . ",
                    " . selectExprOrEmpty($cols['gstin'], 'gstin') . "
                 FROM customers
                 WHERE {$cols['name']} = ?
                 LIMIT 1"
            );
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

            $customerName = trim($data['customer_name']);
            $address1 = $data['address_line1'] ?? ($data['customer_address1'] ?? '');
            $address2 = $data['address_line2'] ?? ($data['customer_address2'] ?? '');
            $address3 = $data['address_line3'] ?? ($data['customer_address3'] ?? '');
            $gstin = $data['gstin'] ?? ($data['customer_gstin'] ?? '');

            $existsStmt = $pdo->prepare("SELECT COUNT(*) FROM customers WHERE {$cols['name']} = ?");
            $existsStmt->execute([$customerName]);
            $exists = ((int)$existsStmt->fetchColumn()) > 0;

            $setParts = [];
            $setValues = [];

            if ($cols['addr1']) {
                $setParts[] = "{$cols['addr1']} = ?";
                $setValues[] = $address1;
            }
            if ($cols['addr2']) {
                $setParts[] = "{$cols['addr2']} = ?";
                $setValues[] = $address2;
            }
            if ($cols['addr3']) {
                $setParts[] = "{$cols['addr3']} = ?";
                $setValues[] = $address3;
            }
            if ($cols['gstin']) {
                $setParts[] = "{$cols['gstin']} = ?";
                $setValues[] = $gstin;
            }

            if ($exists) {
                if (!empty($setParts)) {
                    $updateSql = "UPDATE customers SET " . implode(', ', $setParts) . " WHERE {$cols['name']} = ?";
                    $setValues[] = $customerName;
                    $update = $pdo->prepare($updateSql);
                    $update->execute($setValues);
                }
                echo json_encode([
                    'success' => true,
                    'message' => 'Customer updated successfully',
                    'customer_id' => $pdo->lastInsertId()
                ]);
            } else {
                $insertCols = [$cols['name']];
                $insertVals = [$customerName];

                if ($cols['addr1']) {
                    $insertCols[] = $cols['addr1'];
                    $insertVals[] = $address1;
                }
                if ($cols['addr2']) {
                    $insertCols[] = $cols['addr2'];
                    $insertVals[] = $address2;
                }
                if ($cols['addr3']) {
                    $insertCols[] = $cols['addr3'];
                    $insertVals[] = $address3;
                }
                if ($cols['gstin']) {
                    $insertCols[] = $cols['gstin'];
                    $insertVals[] = $gstin;
                }

                $placeholders = implode(', ', array_fill(0, count($insertCols), '?'));
                $insertSql = "INSERT INTO customers (" . implode(', ', $insertCols) . ") VALUES (" . $placeholders . ")";
                $insert = $pdo->prepare($insertSql);
                try {
                    $insert->execute($insertVals);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Customer saved successfully',
                        'customer_id' => $pdo->lastInsertId()
                    ]);
                } catch (PDOException $insertError) {
                    // If it's a duplicate key error, it means customer already exists
                    if (strpos($insertError->getMessage(), 'Duplicate') !== false) {
                        // Customer already exists, update it instead
                        if (!empty($setParts)) {
                            $updateSql = "UPDATE customers SET " . implode(', ', $setParts) . " WHERE {$cols['name']} = ?";
                            $setValues = [];
                            if ($cols['addr1']) $setValues[] = $address1;
                            if ($cols['addr2']) $setValues[] = $address2;
                            if ($cols['addr3']) $setValues[] = $address3;
                            if ($cols['gstin']) $setValues[] = $gstin;
                            $setValues[] = $customerName;
                            $update = $pdo->prepare($updateSql);
                            $update->execute($setValues);
                        }
                        echo json_encode([
                            'success' => true,
                            'message' => 'Customer updated successfully',
                            'customer_id' => $pdo->lastInsertId()
                        ]);
                    } else {
                        throw $insertError;
                    }
                }
            }
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