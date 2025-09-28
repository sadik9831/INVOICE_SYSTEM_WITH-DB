<?php
$host = 'localhost';
$dbname = 'invoices';
$username = 'root';
$password = 'Sadik@2004';
$port = 3306;
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    // Set error mode
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["success" => false, "error" => $e->getMessage()]));
}
?>
