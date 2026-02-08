-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 08, 2026 at 03:02 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `makanapa`
--

-- --------------------------------------------------------

--
-- Table structure for table `offers`
--

CREATE TABLE `offers` (
  `id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `seller_name` varchar(100) DEFAULT NULL,
  `food_name` varchar(100) DEFAULT NULL,
  `price` int(11) DEFAULT NULL,
  `contact` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `offers`
--

INSERT INTO `offers` (`id`, `request_id`, `seller_name`, `food_name`, `price`, `contact`, `created_at`) VALUES
(1, 1, 'Seetty', 'aasss', 10000, '089529129124', '2026-02-08 00:54:56'),
(2, 2, 'Seetty', 'aasss', 10000, '089529129124', '2026-02-08 01:30:15'),
(3, 3, 'Seetty', 'aasss', 10000, '089529129124', '2026-02-08 01:32:26'),
(4, 4, 'Seetty', 'awddawdawa', 10000, '91323239199', '2026-02-08 01:36:18'),
(5, 5, 'Seetty', 'dwwqddwdw', 10000, 'wdvseef', '2026-02-08 01:39:09'),
(6, 6, 'Seetty', 'qefffe', 129929, '129219912', '2026-02-08 01:49:56');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `request_id` int(11) DEFAULT NULL,
  `buyer_name` varchar(100) DEFAULT NULL,
  `buyer_address` text DEFAULT NULL,
  `seller_name` varchar(100) DEFAULT NULL,
  `food_name` varchar(100) DEFAULT NULL,
  `price` int(11) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `total` int(11) DEFAULT NULL,
  `contact` varchar(30) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `request_id`, `buyer_name`, `buyer_address`, `seller_name`, `food_name`, `price`, `quantity`, `total`, `contact`, `created_at`) VALUES
(1, 4, 'sads', 'Jalan Haji Umar Ismail, Kota Jababeka, Simpangan, Kab Bekasi, West Java, Java, 17533, Indonesia', 'Seetty', 'awddawdawa', 10000, 1, 10000, '91323239199', '2026-02-08 01:36:23'),
(2, 4, 'sads', 'Jalan Haji Umar Ismail, Kota Jababeka, Simpangan, Kab Bekasi, West Java, Java, 17533, Indonesia', 'Seetty', 'awddawdawa', 10000, 2, 20000, '91323239199', '2026-02-08 01:36:35'),
(3, 5, 'sads', 'Jalan Haji Umar Ismail, Kota Jababeka, Simpangan, Kab Bekasi, West Java, Java, 17533, Indonesia', 'Seetty', 'dwwqddwdw', 10000, 1, 10000, '', '2026-02-08 01:39:15'),
(4, 6, 'sads', 'Jalan Haji Umar Ismail, Kota Jababeka, Simpangan, Kab Bekasi, West Java, Java, 17533, Indonesia', 'Seetty', 'qefffe', 129929, 1, 129929, '129219912', '2026-02-08 01:50:01');

-- --------------------------------------------------------

--
-- Table structure for table `requests`
--

CREATE TABLE `requests` (
  `id` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `quantity` int(11) DEFAULT 1,
  `buyer_name` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `requests`
--

INSERT INTO `requests` (`id`, `description`, `created_at`, `quantity`, `buyer_name`) VALUES
(1, 'asasa', '2026-02-08 00:54:48', 1, 'sads'),
(2, 'wdwqw', '2026-02-08 01:30:05', 1, 'sads'),
(3, 'qdwqdwdqwdqwdqwdqdwqd', '2026-02-08 01:32:18', 1, 'sads'),
(4, 'dwdaas', '2026-02-08 01:36:05', 1, 'sads'),
(5, 'wqqdw', '2026-02-08 01:38:58', 1, 'sads'),
(6, 'efqeeqe', '2026-02-08 01:49:38', 1, 'sads');

-- --------------------------------------------------------

--
-- Table structure for table `user_habits`
--

CREATE TABLE `user_habits` (
  `id` int(11) NOT NULL,
  `avg_price` int(11) DEFAULT NULL,
  `last_food` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `cheapest_count` int(11) DEFAULT 0,
  `total_orders` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `offers`
--
ALTER TABLE `offers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `requests`
--
ALTER TABLE `requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `user_habits`
--
ALTER TABLE `user_habits`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `offers`
--
ALTER TABLE `offers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `requests`
--
ALTER TABLE `requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `user_habits`
--
ALTER TABLE `user_habits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
