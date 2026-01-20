<?php
include 'db.php';

try {
    // Get table structure
    $stmt = $pdo->query("DESCRIBE invoices");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h3>Invoices Table Structure:</h3><pre>";
    print_r($columns);
    echo "</pre>";
    
    // Also check invoice_items structure
    $stmt2 = $pdo->query("DESCRIBE invoice_items");
    $columns2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h3>Invoice Items Table Structure:</h3><pre>";
    print_r($columns2);
    echo "</pre>";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
