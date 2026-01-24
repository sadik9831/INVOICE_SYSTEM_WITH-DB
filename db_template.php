<?php
// Database Configuration for Hosting
// UPDATE THESE VALUES WITH YOUR HOSTING PROVIDER'S CREDENTIALS

$host = 'localhost';                    // Usually 'localhost' for most hosts
$dbname = 'your_database_name';         // Get from hosting control panel
$username = 'your_database_username';   // Get from hosting control panel  
$password = 'your_database_password';   // Get from hosting control panel
$port = 3306;

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    // Set error mode
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["success" => false, "error" => $e->getMessage()]));
}
?>
