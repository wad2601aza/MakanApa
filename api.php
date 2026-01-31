<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

$conn = new mysqli("localhost", "root", "auxilia1407", "makanapa");
$action = $_REQUEST['action'] ?? '';

// 🔥 Auto-clean old requests (12 hours)
$conn->query("
    DELETE FROM requests
    WHERE created_at < NOW() - INTERVAL 12 HOUR
");

/* =========================
   CREATE REQUEST
========================= */
if ($action === 'create_request') {
    $desc = $_POST['description'] ?? '';
    $conn->query("INSERT INTO requests (description) VALUES ('$desc')");
    echo json_encode(['request_id' => $conn->insert_id]);
    exit;
}

/* =========================
   GET REQUESTS (SELLER)
========================= */
if ($action === 'get_requests') {
    $res = $conn->query("
        SELECT id, description, created_at
        FROM requests
        ORDER BY created_at DESC
    ");
    echo json_encode($res->fetch_all(MYSQLI_ASSOC));
    exit;
}

/* =========================
   ADD OFFER
========================= */
if ($action === 'add_offer') {
    $conn->query("
        INSERT INTO offers (request_id, seller_name, food_name, price, contact)
        VALUES (
            '{$_POST['request_id']}',
            '{$_POST['seller_name']}',
            '{$_POST['food_name']}',
            '{$_POST['price']}',
            '{$_POST['contact']}'
        )
    ");
    echo json_encode(['status' => 'ok']);
    exit;
}

/* =========================
   GET OFFERS (BUYER)
========================= */
if ($action === 'get_offers') {
    $id = (int) $_GET['request_id'];
    $res = $conn->query("SELECT * FROM offers WHERE request_id = $id");
    echo json_encode($res->fetch_all(MYSQLI_ASSOC));
    exit;
}

/* =========================
   SAVE HABIT
========================= */
if ($action === 'save_habit') {

    $food  = $_POST['food_name'] ?? '';
    $price = isset($_POST['price']) ? (int)$_POST['price'] : 0;

    if (!$food || !$price) {
        echo json_encode(["error" => "Missing data"]);
        exit;
    }

    $res = $conn->query("SELECT * FROM user_habits LIMIT 1");

    if ($row = $res->fetch_assoc()) {
        $avg = $row['avg_price']
            ? round(($row['avg_price'] * 2 + $price) / 3)
            : $price;

        $stmt = $conn->prepare(
            "UPDATE user_habits SET avg_price=?, last_food=?"
        );
        $stmt->bind_param("is", $avg, $food);
        $stmt->execute();
    } else {
        $stmt = $conn->prepare(
            "INSERT INTO user_habits (avg_price, last_food)
             VALUES (?, ?)"
        );
        $stmt->bind_param("is", $price, $food);
        $stmt->execute();
    }

    echo json_encode(["success" => true]);
    exit;
}

/* =========================
   GET HABITS
========================= */
if ($action === 'get_habits') {

    $res = $conn->query(
        "SELECT avg_price, last_food FROM user_habits LIMIT 1"
    );

    if ($row = $res->fetch_assoc()) {
        echo json_encode([
            "avg_price" => (int)$row['avg_price'],
            "last_food" => $row['last_food']
        ]);
    } else {
        echo json_encode([
            "avg_price" => null,
            "last_food" => null
        ]);
    }
    exit;
}
