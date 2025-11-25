<?php
$host = "host.docker.internal";
$username = "root";
$password = "";
$database = "qlydatsan";

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    die("Kết nối thất bại: " . $conn->connect_error);
}