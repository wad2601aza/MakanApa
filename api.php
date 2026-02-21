<?php
header("Content-Type: application/json");

// Mencegah error teks muncul di layar agar tidak merusak format JSON
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
error_reporting(E_ALL);
ini_set('display_errors', 0); 

try {
    $conn = new mysqli("localhost", "root", "", "makanapa");
} catch (Exception $e) {
    echo json_encode(["error" => "Database connection failed"]);
    exit;
}

$action = $_REQUEST['action'] ?? '';

// 🔥 Auto-clean old requests (12 hours)
$conn->query("DELETE FROM requests WHERE created_at < NOW() - INTERVAL 12 HOUR");

// Gunakan Switch Case untuk SEMUA action agar rapi
switch ($action) {

    case 'get_balance':
        $user_id = intval($_GET['user_id'] ?? 1);
        $stmt = $conn->prepare("SELECT balance FROM users WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $stmt->bind_result($balance);
        $stmt->fetch();
        echo json_encode(["balance" => $balance]);
        break;

    case 'get_user':
        $user_id = intval($_GET['user_id'] ?? 1);
        $result = $conn->query("SELECT * FROM users WHERE id = $user_id");
        echo json_encode($result->fetch_assoc() ?: []);
        break;

    case 'create_request':
        $buyer = $_POST['buyer_name'] ?? '';
        $desc  = $_POST['description'] ?? '';
        if (!$buyer || !$desc) {
            echo json_encode(["error" => "Missing data"]);
        } else {
            $stmt = $conn->prepare("INSERT INTO requests (buyer_name, description) VALUES (?, ?)");
            $stmt->bind_param("ss", $buyer, $desc);
            $stmt->execute();
            echo json_encode(["success" => true, "request_id" => $conn->insert_id]);
        }
        break;

    case 'get_requests':
        $res = $conn->query("SELECT * FROM requests ORDER BY created_at DESC");
        echo json_encode($res->fetch_all(MYSQLI_ASSOC));
        break;

    case 'get_offers':
        $request_id = intval($_GET['request_id'] ?? 0);
        $stmt = $conn->prepare("SELECT * FROM offers WHERE request_id = ? ORDER BY created_at ASC");
        $stmt->bind_param("i", $request_id);
        $stmt->execute();
        echo json_encode($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
        break;

    case 'add_offer':
        $request_id  = intval($_POST['request_id'] ?? 0);
        $seller_name = $_POST['seller_name'] ?? '';
        $food_name   = $_POST['food_name'] ?? '';
        $price       = intval($_POST['price'] ?? 0);
        $contact     = $_POST['contact'] ?? '';
        
        $stmt = $conn->prepare("INSERT INTO offers (request_id, seller_name, food_name, price, contact) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("issis", $request_id, $seller_name, $food_name, $price, $contact);
        $stmt->execute();
        echo json_encode(["success" => true]);
        break;

    case 'set_balance':
        $user_id = intval($_POST['user_id'] ?? 1);
        $amount  = intval($_POST['amount'] ?? 0);
        
        $conn->begin_transaction();
        try {
            $conn->query("UPDATE users SET balance = balance + $amount WHERE id = $user_id");
            $stmt = $conn->prepare("INSERT INTO balance_history (user_id, type, amount, description) VALUES (?, 'topup', ?, 'Balance Top Up')");
            $stmt->bind_param("ii", $user_id, $amount);
            $stmt->execute();
            $conn->commit();
            echo json_encode(["success" => true]);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'get_combined_history':
        $user_id = intval($_GET['user_id'] ?? 1);
        $sql = "
            (SELECT 'topup' as type, description as title, 'Balance Added' as details, amount, 1 as qty, created_at as date 
             FROM balance_history WHERE type = 'topup' AND user_id = $user_id)
            UNION ALL
            (SELECT 'payment' as type, food_name as title, seller_name as details, total as amount, quantity as qty, created_at as date 
             FROM orders WHERE user_id = $user_id)
            ORDER BY date DESC";
        $result = $conn->query($sql);
        echo json_encode($result->fetch_all(MYSQLI_ASSOC));
        break;

    case 'create_order':
        $user_id = intval($_POST['user_id'] ?? 1);
        $total = intval($_POST['total'] ?? 0);
        
        // Cek saldo dulu
        $userRes = $conn->query("SELECT balance FROM users WHERE id = $user_id");
        $user = $userRes->fetch_assoc();

        if (!$user || $user['balance'] < $total) {
            echo json_encode(['success' => false, 'error' => 'Saldo tidak cukup!']);
            exit;
        }

        $conn->begin_transaction();
        try {
            // 1. Potong Saldo
            $conn->query("UPDATE users SET balance = balance - $total WHERE id = $user_id");

            // 2. Simpan Order
            $stmt = $conn->prepare("INSERT INTO orders (user_id, request_id, buyer_name, buyer_address, seller_name, food_name, price, quantity, total, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisssssiis", $user_id, $_POST['request_id'], $_POST['buyer_name'], $_POST['buyer_address'], $_POST['seller_name'], $_POST['food_name'], $_POST['price'], $_POST['quantity'], $total, $_POST['contact']);
            $stmt->execute();
            $order_id = $stmt->insert_id;

            // 3. Catat History Pengeluaran (-)
            $desc = "Payment for " . $_POST['food_name'];
            $conn->query("INSERT INTO balance_history (user_id, type, amount, reference_id, description) VALUES ($user_id, 'payment', $total, $order_id, '$desc')");

            $conn->commit();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(["error" => "Invalid action: " . $action]);
        break;
}
?>