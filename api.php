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
    $buyer = $_POST['buyer_name'] ?? '';
    $desc  = $_POST['description'] ?? '';

    $stmt = $conn->prepare("
        INSERT INTO requests (buyer_name, description)
        VALUES (?, ?)
    ");

    $stmt->bind_param("ss", $buyer, $desc);
    $stmt->execute();

    echo json_encode([
        'request_id' => $conn->insert_id,
        'buyer_name' => $buyer
    ]);

    exit;
}

/* =========================
   GET REQUESTS (SELLER)
========================= */
if ($action === 'get_requests') {
    $res = $conn->query("
        SELECT id, buyer_name, description, created_at
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
   GET HABITS (SELLER)
========================= */
if ($action === 'get_habits') {

    $res = $conn->query("
        SELECT avg_price, last_food, cheapest_count, total_orders
        FROM user_habits
        LIMIT 1
    ");

    if ($row = $res->fetch_assoc()) {
        echo json_encode($row);
    } else {
        echo json_encode(null);
    }
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
if ($action === 'save_habit') {

    $price = (int) ($_POST['price'] ?? 0);
    $food  = $_POST['food_name'] ?? '';
    $is_cheapest = (int) ($_POST['is_cheapest'] ?? 0);

    $res = $conn->query("SELECT * FROM user_habits LIMIT 1");

    if ($row = $res->fetch_assoc()) {

        $newAvg = round(($row['avg_price'] * $row['total_orders'] + $price)
                        / ($row['total_orders'] + 1));

        $stmt = $conn->prepare("
            UPDATE user_habits
            SET avg_price=?,
                last_food=?,
                cheapest_count = cheapest_count + ?,
                total_orders = total_orders + 1
        ");
        $stmt->bind_param("isii", $newAvg, $food, $is_cheapest);
        $stmt->execute();

    } else {
        $stmt = $conn->prepare("
            INSERT INTO user_habits
            (avg_price, last_food, cheapest_count, total_orders)
            VALUES (?, ?, ?, 1)
        ");
        $stmt->bind_param("isi", $price, $food, $is_cheapest);
        $stmt->execute();
    }

    echo json_encode(["success" => true]);
    exit;
}

/* =========================
   CREATE ORDER (HISTORY)
========================= */
if ($action === 'create_order') {

    $stmt = $conn->prepare("
        INSERT INTO orders
        (
            request_id,
            buyer_name,
            buyer_address,
            seller_name,
            food_name,
            price,
            quantity,
            total,
            contact
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->bind_param(
        "issssiiis",

        $_POST['request_id'],
        $_POST['buyer_name'],
        $_POST['buyer_address'],

        $_POST['seller_name'],
        $_POST['food_name'],

        $_POST['price'],
        $_POST['quantity'],
        $_POST['total'],

        $_POST['contact']
    );

    $stmt->execute();

    echo json_encode([
        "success" => true,
        "order_id" => $conn->insert_id
    ]);

    exit;
}

/* =========================
   GET ORDER HISTORY
========================= */
if ($action === 'get_orders') {

    $res = $conn->query("
        SELECT *
        FROM orders
        ORDER BY created_at DESC
        LIMIT 50
    ");

    echo json_encode(
        $res->fetch_all(MYSQLI_ASSOC)
    );

    exit;
}

