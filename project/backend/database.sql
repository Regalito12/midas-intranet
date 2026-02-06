-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: intranet_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `approval_levels`
--

DROP TABLE IF EXISTS `approval_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `approval_levels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `rank` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rank` (`rank`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_levels`
--

LOCK TABLES `approval_levels` WRITE;
/*!40000 ALTER TABLE `approval_levels` DISABLE KEYS */;
INSERT INTO `approval_levels` VALUES (1,'Supervisor',1),(2,'Gerente',2),(3,'Director',3),(4,'VP / CXO',4);
/*!40000 ALTER TABLE `approval_levels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_matrix`
--

DROP TABLE IF EXISTS `approval_matrix`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `approval_matrix` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `department` varchar(100) DEFAULT 'GLOBAL',
  `min_amount` decimal(15,2) DEFAULT 0.00,
  `max_amount` decimal(15,2) DEFAULT 999999999.00,
  `approval_level_id` int(11) NOT NULL,
  `approver_role` varchar(50) DEFAULT NULL,
  `specific_user_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `approval_level_id` (`approval_level_id`),
  CONSTRAINT `approval_matrix_ibfk_1` FOREIGN KEY (`approval_level_id`) REFERENCES `approval_levels` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_matrix`
--

LOCK TABLES `approval_matrix` WRITE;
/*!40000 ALTER TABLE `approval_matrix` DISABLE KEYS */;
INSERT INTO `approval_matrix` VALUES (1,'GLOBAL',0.00,999999999.00,1,'supervisor',NULL,1),(2,'GLOBAL',50000.00,999999999.00,2,'manager',NULL,1),(3,'GLOBAL',500000.00,999999999.00,4,'vp',NULL,1);
/*!40000 ALTER TABLE `approval_matrix` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attendance` (
  `id` varchar(255) NOT NULL,
  `employee_id` varchar(255) NOT NULL,
  `employee_name` varchar(255) NOT NULL,
  `employee_department` varchar(100) DEFAULT NULL,
  `date` date NOT NULL,
  `check_in` time DEFAULT NULL,
  `check_out` time DEFAULT NULL,
  `hours_worked` decimal(5,2) DEFAULT 0.00,
  `status` varchar(20) DEFAULT 'presente',
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_date` (`employee_id`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
INSERT INTO `attendance` VALUES ('att_1_1765070639047','1','Administrador del Sistema','General','2025-12-07','21:23:59','21:24:07',0.00,'presente',NULL),('att_1_8d74da56-695c-49ff-b4c0-773ba798773c','1','Antonio','Tecnologia','2026-01-14','16:14:13',NULL,0.00,'presente',NULL),('att_1_f3622f09-c6c3-420c-b977-42ee14efc90e','1','Antonio Andujar','Tecnologia','2026-01-28','11:46:02','15:46:06',4.00,'presente',NULL);
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `action` varchar(100) DEFAULT NULL,
  `entity` varchar(100) DEFAULT NULL,
  `entity_id` varchar(50) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_entity` (`entity`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,NULL,'rrhh','LOGIN_FAILED','auth',NULL,'{\"reason\":\"Usuario no encontrado\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0','2025-12-07 00:58:19'),(2,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0','2025-12-07 00:58:43'),(3,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0','2025-12-07 03:26:38'),(4,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0','2025-12-07 04:58:28'),(5,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0','2025-12-07 05:15:40'),(6,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0','2025-12-07 06:47:28'),(7,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36','2025-12-07 16:27:05'),(8,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 16:12:38'),(9,NULL,NULL,'CREATE','user','3','{\"username\":\"Jorddy\",\"name\":\"Jorddy Rosario\",\"role\":\"empleado\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 16:23:07'),(10,3,'Jorddy','LOGIN','auth',NULL,'{\"role\":\"empleado\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 17:24:49'),(11,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 18:27:39'),(12,NULL,'Jorddy','LOGIN_BLOCKED','auth',NULL,'{\"reason\":\"Usuario inactivo\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 18:42:18'),(13,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 18:51:45'),(14,3,'Jorddy','LOGIN','auth',NULL,'{\"role\":\"empleado\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 19:02:00'),(15,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 19:37:36'),(16,NULL,NULL,'CREATE','user','4','{\"username\":\"Junior\",\"name\":\"Junior Chalas\",\"role\":\"soporte\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 19:40:15'),(17,4,'Junior','LOGIN','auth',NULL,'{\"role\":\"soporte\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 19:40:51'),(18,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 19:44:12'),(19,4,'Junior','LOGIN','auth',NULL,'{\"role\":\"soporte\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 19:45:32'),(20,3,'Jorddy','LOGIN_FAILED','auth',NULL,'{\"reason\":\"Contraseña incorrecta\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 20:03:55'),(21,3,'Jorddy','LOGIN','auth',NULL,'{\"role\":\"empleado\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 20:04:15'),(22,4,'Junior','LOGIN','auth',NULL,'{\"role\":\"soporte\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 20:05:57'),(23,3,'Jorddy','LOGIN','auth',NULL,'{\"role\":\"empleado\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 20:07:00'),(24,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 20:21:26'),(25,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 20:37:47'),(26,3,'Jorddy','LOGIN','auth',NULL,'{\"role\":\"empleado\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-10 20:50:11'),(27,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-18 10:54:50'),(28,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-18 13:47:25'),(29,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; es-DO) WindowsPowerShell/5.1.22621.4249','2026-01-14 18:31:20'),(30,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2026-01-14 18:32:18'),(31,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','127.0.0.1',NULL,'2026-01-14 20:03:51'),(32,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2026-01-14 20:11:27'),(33,3,'Jorddy','LOGIN','auth',NULL,'{\"role\":\"empleado\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2026-01-14 20:11:59'),(34,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2026-01-14 20:12:33'),(35,1,'admin','LOGIN_FAILED','auth',NULL,'{\"reason\":\"Contraseña incorrecta\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0','2026-01-28 13:09:40'),(36,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0','2026-01-28 13:36:29'),(37,3,'Jorddy','LOGIN','auth',NULL,'{\"role\":\"empleado\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0','2026-01-28 15:35:25'),(38,1,'admin','LOGIN','auth',NULL,'{\"role\":\"admin\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0','2026-01-28 15:44:43');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_project_approvals`
--

DROP TABLE IF EXISTS `budget_project_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_project_approvals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `approval_level` int(11) NOT NULL,
  `required_role` varchar(50) NOT NULL,
  `approver_id` int(11) DEFAULT NULL,
  `approval_status` varchar(50) DEFAULT 'PENDIENTE',
  `approval_date` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `budget_project_approvals_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `budget_project_planning` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_project_approvals`
--

LOCK TABLES `budget_project_approvals` WRITE;
/*!40000 ALTER TABLE `budget_project_approvals` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_project_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_project_items`
--

DROP TABLE IF EXISTS `budget_project_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_project_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `phase` varchar(50) DEFAULT 'Q1',
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `budget_project_items_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `budget_project_planning` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_project_items`
--

LOCK TABLES `budget_project_items` WRITE;
/*!40000 ALTER TABLE `budget_project_items` DISABLE KEYS */;
INSERT INTO `budget_project_items` VALUES (1,1,'Server Rack',2,5000.00,10000.00,'Q1'),(2,1,'Cables',10,100.00,1000.00,'Q1'),(3,2,'Server Rack',2,5000.00,10000.00,'Q1'),(4,2,'Cables',10,100.00,1000.00,'Q1');
/*!40000 ALTER TABLE `budget_project_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_project_planning`
--

DROP TABLE IF EXISTS `budget_project_planning`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_project_planning` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_code` varchar(50) NOT NULL,
  `project_name` varchar(255) NOT NULL,
  `project_type` varchar(100) NOT NULL,
  `area_id` int(11) NOT NULL,
  `cost_center_id` int(11) NOT NULL,
  `responsible_user_id` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `project_objective` text DEFAULT NULL,
  `institutional_objective` text DEFAULT NULL,
  `expected_roi` text DEFAULT NULL,
  `budgeted_amount` decimal(15,2) DEFAULT 0.00,
  `committed_amount` decimal(15,2) DEFAULT 0.00,
  `spent_amount` decimal(15,2) DEFAULT 0.00,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `execution_quarter` varchar(10) DEFAULT NULL,
  `fiscal_year` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'BORRADOR',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approval_notes` text DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejected_by` int(11) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_code` (`project_code`),
  KEY `responsible_user_id` (`responsible_user_id`),
  KEY `cost_center_id` (`cost_center_id`),
  CONSTRAINT `budget_project_planning_ibfk_1` FOREIGN KEY (`responsible_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `budget_project_planning_ibfk_2` FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_project_planning`
--

LOCK TABLES `budget_project_planning` WRITE;
/*!40000 ALTER TABLE `budget_project_planning` DISABLE KEYS */;
INSERT INTO `budget_project_planning` VALUES (1,'AREA1-2026-Q1-001','Audit Validated Project','Inversión',1,1,1,'Automated Test Project','Obj','Inst',NULL,11000.00,0.00,0.00,'2026-01-01','2026-03-31','Q1',2026,'BORRADOR',1,'2026-02-01 21:54:14',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(2,'AREA1-2026-Q1-002','Audit Validated Project','Inversión',1,1,1,'Automated Test Project','Obj','Inst',NULL,11000.00,0.00,0.00,'2026-01-01','2026-03-31','Q1',2026,'BORRADOR',1,'2026-02-01 21:54:38','2026-02-04 20:08:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `budget_project_planning` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budgets`
--

DROP TABLE IF EXISTS `budgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budgets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cost_center_id` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `period` varchar(20) DEFAULT 'ANNUAL',
  `total_amount` decimal(15,2) NOT NULL,
  `committed_amount` decimal(15,2) DEFAULT 0.00,
  `spent_amount` decimal(15,2) DEFAULT 0.00,
  `currency` varchar(3) DEFAULT 'DOP',
  `active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `cost_center_id` (`cost_center_id`),
  CONSTRAINT `budgets_ibfk_1` FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budgets`
--

LOCK TABLES `budgets` WRITE;
/*!40000 ALTER TABLE `budgets` DISABLE KEYS */;
/*!40000 ALTER TABLE `budgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_rules`
--

DROP TABLE IF EXISTS `business_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `rule_type` varchar(50) NOT NULL,
  `entity_target` varchar(50) NOT NULL,
  `conditions_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`conditions_json`)),
  `actions_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`actions_json`)),
  `priority` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_rules`
--

LOCK TABLES `business_rules` WRITE;
/*!40000 ALTER TABLE `business_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `business_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `companies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL COMMENT 'Código único: MIDAS-DOM',
  `name` varchar(255) NOT NULL COMMENT 'Nombre comercial',
  `legal_name` varchar(255) DEFAULT NULL COMMENT 'Razón social',
  `tax_id` varchar(50) DEFAULT NULL COMMENT 'RNC o identificación fiscal',
  `active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_active` (`active`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Empresas del grupo MIDAS';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (9,'MIDAS-DOM','Midas Dominicana',NULL,NULL,1,'2026-01-28 12:28:41'),(10,'MIDAS-SEG','Midas Seguros',NULL,NULL,1,'2026-01-28 12:28:41'),(11,'GSTAR','Gstar Services',NULL,NULL,1,'2026-01-28 12:28:41');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cost_centers`
--

DROP TABLE IF EXISTS `cost_centers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cost_centers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `manager_id` int(11) DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `company_id` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cost_centers`
--

LOCK TABLES `cost_centers` WRITE;
/*!40000 ALTER TABLE `cost_centers` DISABLE KEYS */;
INSERT INTO `cost_centers` VALUES (1,'IT-001','Tecnología',NULL,1,1);
/*!40000 ALTER TABLE `cost_centers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `departments` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `manager_id` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES ('2193b274-94b9-4562-91b8-e8cb8db3c1a9','Tecnologia','1','Tecnología','2026-01-14 18:46:54',1),('65c747b6-a20c-445d-b7c3-89d0abe77394','Dirección',NULL,'Gerencia General','2026-01-14 18:46:54',1),('93de161b-acfc-4f7e-b03b-bc7250f14549','RRHH',NULL,'Recursos Humanos','2026-01-14 18:46:54',1);
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `employees` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `position` varchar(255) NOT NULL,
  `department` varchar(100) NOT NULL,
  `extension` varchar(20) DEFAULT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT 0,
  `status` varchar(20) DEFAULT 'activo',
  `user_id` int(11) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES ('emp_1','Antonio Andujar','admin@midas.com','Administrador','GENERAL',NULL,'http://localhost:3001/uploads/optimized-avatar-1769628401613-735855232.jpeg',0,'activo',1,'8098342333','2025-12-06 17:26:09',NULL),('emp_3','Jorddy Rosario','Jordanysjor@gmail.com','Desarrollador Junior','Tecnologia',NULL,'http://localhost:3001/uploads/optimized-avatar-1769628552401-577954203.jpeg',0,'activo',3,'','2025-12-10 12:23:07',NULL),('emp_4','Junior Chalas','soporte@midas.com','Soporte Tecnico','Tecnologia',NULL,'http://localhost:3001/uploads/optimized-avatar-1769630981512-192625060.png',0,'activo',4,'','2025-12-10 15:40:15',NULL);
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `type` enum('meeting','holiday','event','deadline') DEFAULT 'event',
  `location` varchar(255) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `it_tickets`
--

DROP TABLE IF EXISTS `it_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `it_tickets` (
  `id` varchar(255) NOT NULL,
  `ticket_number` varchar(50) NOT NULL,
  `requester_id` varchar(255) NOT NULL,
  `requester_name` varchar(255) NOT NULL,
  `requester_department` varchar(100) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `category` varchar(50) DEFAULT 'hardware',
  `priority` varchar(20) DEFAULT 'media',
  `status` varchar(20) DEFAULT 'abierto',
  `assigned_to_id` int(11) DEFAULT NULL,
  `assigned_to_name` varchar(255) DEFAULT NULL,
  `assigned_to` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_ticket_number` (`ticket_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `it_tickets`
--

LOCK TABLES `it_tickets` WRITE;
/*!40000 ALTER TABLE `it_tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `it_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `news`
--

DROP TABLE IF EXISTS `news`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `news` (
  `id` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `excerpt` text DEFAULT NULL,
  `category` varchar(50) DEFAULT 'general',
  `date` datetime NOT NULL,
  `author` varchar(255) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `news`
--

LOCK TABLES `news` WRITE;
/*!40000 ALTER TABLE `news` DISABLE KEYS */;
INSERT INTO `news` VALUES ('1765375255149','San Valero Lo maximo!','Se ha podido ver que San Valero ha demostrado que sus estudiantes son lo maximo','San valero e la vuelta','comunicado','2025-12-10 10:00:55','Antonio Andujar','http://localhost:3301/uploads/Logo_300-1765375201190-484124239.jpg');
/*!40000 ALTER TABLE `news` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `news_categories`
--

DROP TABLE IF EXISTS `news_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `news_categories` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `color` varchar(20) DEFAULT '#00B74F',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `news_categories`
--

LOCK TABLES `news_categories` WRITE;
/*!40000 ALTER TABLE `news_categories` DISABLE KEYS */;
INSERT INTO `news_categories` VALUES ('comunicado','Comunicado Oficial','#EF4444','2026-01-14 18:49:31'),('eventos','Eventos','#F59E0B','2026-01-14 18:49:31'),('general','General','#6B7280','2026-01-14 18:49:30'),('rrhh','Recursos Humanos','#8B5CF6','2026-01-14 18:49:31'),('tecnologia','Tecnología','#3B82F6','2026-01-14 18:49:31');
/*!40000 ALTER TABLE `news_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `news_comments`
--

DROP TABLE IF EXISTS `news_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `news_comments` (
  `id` varchar(255) NOT NULL,
  `news_id` varchar(255) NOT NULL,
  `parent_id` varchar(255) DEFAULT NULL,
  `user_id` varchar(255) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `user_avatar` varchar(500) DEFAULT NULL,
  `comment_text` text NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `news_id` (`news_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `news_comments`
--

LOCK TABLES `news_comments` WRITE;
/*!40000 ALTER TABLE `news_comments` DISABLE KEYS */;
INSERT INTO `news_comments` VALUES ('comm_1765375276617','1765375255149',NULL,'1','Antonio Andujar','http://localhost:3301/uploads/optimized-avatar-1765083463325-208626736.jpeg','increible!!','2025-12-10 10:01:16'),('comm_1765387656405','1765375255149','comm_1765375276617','3','Jorddy Rosario','http://localhost:3301/uploads/optimized-avatar-1765387622622-258184103.jpeg','Es lo máximo!!!','2025-12-10 13:27:36'),('comm_1765387705442','1765375255149',NULL,'3','Jorddy Rosario','http://localhost:3301/uploads/optimized-avatar-1765387622622-258184103.jpeg','Gran Politécnico 😎😎😎','2025-12-10 13:28:25'),('comm_1765395962561','1765375255149','comm_1765387705442','4','Junior Chalas','http://localhost:3301/uploads/optimized-avatar-1765395707337-960143181.jpeg','Cierto!!','2025-12-10 15:46:02');
/*!40000 ALTER TABLE `news_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `news_reactions`
--

DROP TABLE IF EXISTS `news_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `news_reactions` (
  `id` varchar(255) NOT NULL,
  `news_id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `reaction_type` varchar(20) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_news_reaction` (`news_id`,`user_id`),
  KEY `news_id` (`news_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `news_reactions`
--

LOCK TABLES `news_reactions` WRITE;
/*!40000 ALTER TABLE `news_reactions` DISABLE KEYS */;
INSERT INTO `news_reactions` VALUES ('react_1765375263779','1765375255149','1','Antonio Andujar','like','2025-12-10 10:01:03'),('react_1765388716813','1765375255149','3','Jorddy Rosario','haha','2025-12-10 13:45:16');
/*!40000 ALTER TABLE `news_reactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` varchar(50) DEFAULT 'info',
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `related_id` varchar(100) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_slips`
--

DROP TABLE IF EXISTS `payroll_slips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payroll_slips` (
  `id` varchar(255) NOT NULL,
  `employee_id` varchar(255) NOT NULL,
  `employee_name` varchar(255) NOT NULL,
  `employee_position` varchar(255) DEFAULT NULL,
  `employee_department` varchar(100) DEFAULT NULL,
  `month` varchar(20) NOT NULL,
  `year` int(11) NOT NULL,
  `period` varchar(50) NOT NULL,
  `base_salary` decimal(10,2) NOT NULL,
  `bonuses` decimal(10,2) DEFAULT 0.00,
  `overtime` decimal(10,2) DEFAULT 0.00,
  `gross_salary` decimal(10,2) NOT NULL,
  `afp` decimal(10,2) DEFAULT 0.00,
  `sfs` decimal(10,2) DEFAULT 0.00,
  `isr` decimal(10,2) DEFAULT 0.00,
  `other_deductions` decimal(10,2) DEFAULT 0.00,
  `total_deductions` decimal(10,2) NOT NULL,
  `net_salary` decimal(10,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` varchar(50) DEFAULT 'Transferencia',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_slips`
--

LOCK TABLES `payroll_slips` WRITE;
/*!40000 ALTER TABLE `payroll_slips` DISABLE KEYS */;
INSERT INTO `payroll_slips` VALUES ('1765379794274','emp_1','Antonio Andujar','','','diciembre',2025,'15-30 noviembre',50000.00,10000.00,300.00,60300.00,1730.61,1833.12,3842.25,0.00,7405.98,52894.02,'2025-12-10','Transferencia');
/*!40000 ALTER TABLE `payroll_slips` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `module` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'view_news','Ver Noticias','news','Ver noticias y avisos'),(2,'manage_news','Gestionar Noticias','news','Crear, editar y borrar noticias'),(3,'create_request','Crear Solicitudes','requests','Crear nuevas solicitudes'),(4,'view_own_requests','Ver Propias Solicitudes','requests','Ver el historial de solicitudes propias'),(5,'approve_requests','Aprobar Solicitudes','requests','Poder aprobar solicitudes en flujo'),(6,'view_payroll','Ver Propia Nómina','payroll','Ver volantes de pago propios'),(7,'manage_payroll','Gestionar Nóminas','payroll','Subir y gestionar volantes de pago'),(8,'view_directory','Ver Directorio','directory','Acceso al directorio de empleados'),(9,'view_attendance','Ver Asistencia','attendance','Ver registros de asistencia'),(10,'manage_attendance','Gestionar Asistencia','attendance','Editar o validar registros de asistencia'),(11,'view_helpdesk','Ver Helpdesk','helpdesk','Acceso a la mesa de ayuda'),(12,'manage_tickets','Gestionar Tickets IT','helpdesk','Atender y cerrar tickets de soporte'),(13,'view_policies','Ver Políticas','policies','Acceso a normativas y políticas'),(14,'manage_policies','Gestionar Políticas','policies','Subir y actualizar políticas'),(15,'view_analytics','Ver Analytics','analytics','Acceso a panel de métricas'),(16,'admin_users','Gestionar Usuarios','admin','CRUD completo de usuarios'),(17,'admin_roles','Gestionar Roles','admin','Crear y asignar permisos dinámicos'),(18,'purchase.request.view','Ver Todas las Solicitudes','purchases','Acceso a todas las solicitudes de compra'),(19,'purchase.request.release','Liberar Solicitudes','purchases','Liberar solicitudes para orden de compra'),(20,'purchase.request.approve','Aprobar Solicitudes','purchases','Aprobar solicitudes de compra'),(21,'purchase.order.view','Ver Órdenes de Compra','purchases','Ver órdenes de compra generadas'),(22,'purchase.order.generate','Generar Órdenes de Compra','purchases','Generar órdenes de compra desde solicitudes'),(23,'purchase.order.approve','Aprobar Órdenes de Compra','purchases','Aprobar órdenes de compra');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `policies`
--

DROP TABLE IF EXISTS `policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `policies` (
  `id` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(50) DEFAULT 'politica',
  `version` varchar(20) DEFAULT '1.0',
  `file_url` varchar(500) DEFAULT NULL,
  `file_type` varchar(20) DEFAULT 'pdf',
  `file_size` int(11) DEFAULT 0,
  `uploaded_by` varchar(255) DEFAULT NULL,
  `uploaded_by_name` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `policies`
--

LOCK TABLES `policies` WRITE;
/*!40000 ALTER TABLE `policies` DISABLE KEYS */;
/*!40000 ALTER TABLE `policies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_approvals`
--

DROP TABLE IF EXISTS `purchase_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_approvals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_request_id` int(11) NOT NULL,
  `approval_level` int(11) NOT NULL,
  `required_role_name` varchar(50) NOT NULL,
  `approval_status` enum('PENDIENTE','APROBADO','RECHAZADO') DEFAULT 'PENDIENTE',
  `approver_id` int(11) DEFAULT NULL,
  `approval_date` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_approvals`
--

LOCK TABLES `purchase_approvals` WRITE;
/*!40000 ALTER TABLE `purchase_approvals` DISABLE KEYS */;
INSERT INTO `purchase_approvals` VALUES (1,1,1,'supervisor','PENDIENTE',NULL,NULL,NULL),(2,1,2,'manager','PENDIENTE',NULL,NULL,NULL);
/*!40000 ALTER TABLE `purchase_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_number` varchar(20) NOT NULL,
  `request_id` int(11) NOT NULL,
  `supplier_name` varchar(255) NOT NULL,
  `supplier_tax_id` varchar(50) DEFAULT NULL,
  `supplier_contact` varchar(255) DEFAULT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `tax_amount` decimal(12,2) DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'DOP',
  `payment_terms` varchar(255) DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `delivery_address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'GENERADA',
  `generated_by` int(11) NOT NULL,
  `generated_at` datetime DEFAULT current_timestamp(),
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `digital_signature` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_request` (`request_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
INSERT INTO `purchase_orders` VALUES (3,'PO-2026-0001',1,'Dell Dominicana','123-45678-9','ventas@dell.com',50000.00,1.00,50000.00,9000.00,59000.00,'DOP','Contado','2026-02-15','Ave. Winston Churchill, Santo Domingo','Orden de prueba para verificar dashboard','GENERADA',3,'2026-01-28 15:55:51',NULL,NULL,NULL,'2026-01-28 15:55:51','2026-01-28 15:55:51'),(4,'PO-2026-0002',1,'Dell Dominicana','123-45678-9','ventas@dell.com',50000.00,1.00,50000.00,9000.00,59000.00,'DOP','Contado','2026-02-15','Ave. Winston Churchill, Santo Domingo','Orden de prueba para verificar dashboard','GENERADA',3,'2026-01-28 15:56:06',NULL,NULL,NULL,'2026-01-28 15:56:06','2026-01-28 15:56:06'),(5,'PO-2026-0003',3,'Omega Tech','987-65432-1','info@omegatech.com',15000.00,2.00,30000.00,5400.00,35400.00,'DOP','Crédito 30 días','2026-02-10','Calle Maximo Gomez','Segunda orden de prueba','GENERADA',3,'2026-01-28 15:57:23',NULL,NULL,NULL,'2026-01-28 15:57:23','2026-01-28 15:57:23');
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_request_attachments`
--

DROP TABLE IF EXISTS `purchase_request_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_request_attachments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_request_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL COMMENT 'Ruta del archivo en servidor',
  `file_type` varchar(50) DEFAULT NULL COMMENT 'PDF, image, Excel, etc.',
  `file_size` int(11) DEFAULT NULL COMMENT 'Tamaño en bytes',
  `uploaded_by` int(11) NOT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_request` (`purchase_request_id`),
  KEY `idx_uploaded_by` (`uploaded_by`),
  CONSTRAINT `purchase_request_attachments_ibfk_1` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_request_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Archivos adjuntos a solicitudes de compra';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_request_attachments`
--

LOCK TABLES `purchase_request_attachments` WRITE;
/*!40000 ALTER TABLE `purchase_request_attachments` DISABLE KEYS */;
INSERT INTO `purchase_request_attachments` VALUES (1,1,'1769629470192-dd065ad1815c740c56948903c6250c68.webp','C:\\Users\\Jorddy\\OneDrive\\Escritorio\\PROYECTOS PERSONALESPROGRAMACION\\MIDAS-Intranet\\project\\backend\\uploads\\1769629470192-dd065ad1815c740c56948903c6250c68.webp','image/webp',15020,1,'2026-01-28 15:44:31');
/*!40000 ALTER TABLE `purchase_request_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_request_items`
--

DROP TABLE IF EXISTS `purchase_request_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_request_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_request_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `estimated_price` decimal(15,2) NOT NULL,
  `total_estimated` decimal(15,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `purchase_request_id` (`purchase_request_id`),
  CONSTRAINT `purchase_request_items_ibfk_1` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_request_items`
--

LOCK TABLES `purchase_request_items` WRITE;
/*!40000 ALTER TABLE `purchase_request_items` DISABLE KEYS */;
INSERT INTO `purchase_request_items` VALUES (1,1,'Laptop','Legion pro 5',1.00,50000.00,50000.00,'2026-01-28 19:44:31');
/*!40000 ALTER TABLE `purchase_request_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_requests`
--

DROP TABLE IF EXISTS `purchase_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_number` varchar(20) NOT NULL COMMENT 'PR-2026-0001',
  `user_id` int(11) NOT NULL COMMENT 'Usuario que solicita',
  `company_id` int(11) NOT NULL COMMENT 'Empresa: Midas Dominicana, etc.',
  `cost_center_id` int(11) NOT NULL COMMENT 'Centro de costo',
  `assignment_type` enum('PROYECTO','RECURRENTE','TAREA_INTERNA') NOT NULL COMMENT 'Tipo de asignación',
  `assignment_reference` varchar(100) DEFAULT NULL COMMENT 'ID de proyecto, tarea, etc.',
  `product_name` varchar(255) NOT NULL COMMENT 'Nombre del producto/servicio',
  `description` text NOT NULL COMMENT 'Descripción detallada',
  `quantity` decimal(10,2) NOT NULL COMMENT 'Cantidad solicitada',
  `estimated_price` decimal(12,2) DEFAULT NULL COMMENT 'Precio estimado unitario (opcional)',
  `total_estimated` decimal(15,2) DEFAULT 0.00,
  `status` enum('SOLICITADO','LIBERADO','APROBADO','RECHAZADO','EN_COMPRAS','ORDEN_GENERADA','CERRADO') NOT NULL DEFAULT 'SOLICITADO' COMMENT 'Estado actual del workflow',
  `released_by` int(11) DEFAULT NULL COMMENT 'Usuario que liberó',
  `released_at` datetime DEFAULT NULL COMMENT 'Fecha de liberación',
  `released_notes` text DEFAULT NULL COMMENT 'Notas de liberación',
  `approved_by` int(11) DEFAULT NULL COMMENT 'Usuario que aprobó',
  `approved_at` datetime DEFAULT NULL COMMENT 'Fecha de aprobación',
  `approved_notes` text DEFAULT NULL COMMENT 'Notas de aprobación',
  `rejected_by` int(11) DEFAULT NULL COMMENT 'Usuario que rechazó',
  `rejected_at` datetime DEFAULT NULL COMMENT 'Fecha de rechazo',
  `rejection_reason` text DEFAULT NULL COMMENT 'Motivo del rechazo',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_number` (`request_number`),
  KEY `released_by` (`released_by`),
  KEY `approved_by` (`approved_by`),
  KEY `rejected_by` (`rejected_by`),
  KEY `idx_request_number` (`request_number`),
  KEY `idx_status` (`status`),
  KEY `idx_user` (`user_id`),
  KEY `idx_company` (`company_id`),
  KEY `idx_cost_center` (`cost_center_id`),
  KEY `idx_created` (`created_at`),
  KEY `idx_workflow` (`status`,`created_at`),
  CONSTRAINT `purchase_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `purchase_requests_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `purchase_requests_ibfk_3` FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers` (`id`),
  CONSTRAINT `purchase_requests_ibfk_4` FOREIGN KEY (`released_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_requests_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_requests_ibfk_6` FOREIGN KEY (`rejected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Solicitudes de compra empresarial';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_requests`
--

LOCK TABLES `purchase_requests` WRITE;
/*!40000 ALTER TABLE `purchase_requests` DISABLE KEYS */;
INSERT INTO `purchase_requests` VALUES (1,'PR-2026-0001',1,9,1,'PROYECTO',NULL,'Laptop','Legion pro 5',1.00,50000.00,50000.00,'ORDEN_GENERADA',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-28 15:44:31','2026-01-28 15:56:06'),(3,'PR-2026-0002',3,9,1,'PROYECTO',NULL,'Monitor 27\' 4K','Monitor para diseño',2.00,15000.00,0.00,'ORDEN_GENERADA',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-28 15:57:22','2026-01-28 15:57:23'),(4,'PR-2026-0003',3,9,1,'PROYECTO',NULL,'Silla Ergonómica','Para oficina central',5.00,8000.00,0.00,'SOLICITADO',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-28 15:57:23','2026-01-28 15:57:23');
/*!40000 ALTER TABLE `purchase_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_serials`
--

DROP TABLE IF EXISTS `purchase_serials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_serials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `serial_type` varchar(10) NOT NULL,
  `fiscal_year` int(11) NOT NULL,
  `last_number` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type_year` (`serial_type`,`fiscal_year`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_serials`
--

LOCK TABLES `purchase_serials` WRITE;
/*!40000 ALTER TABLE `purchase_serials` DISABLE KEYS */;
INSERT INTO `purchase_serials` VALUES (1,'PR',2026,1),(2,'PO',2026,3);
/*!40000 ALTER TABLE `purchase_serials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `request_history`
--

DROP TABLE IF EXISTS `request_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `request_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` varchar(255) NOT NULL,
  `action` varchar(50) NOT NULL,
  `actor_id` int(11) DEFAULT NULL,
  `actor_name` varchar(255) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_req` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `request_history`
--

LOCK TABLES `request_history` WRITE;
/*!40000 ALTER TABLE `request_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `request_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `request_items`
--

DROP TABLE IF EXISTS `request_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `request_items` (
  `id` varchar(255) NOT NULL,
  `request_id` varchar(255) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `unit_price` decimal(10,2) DEFAULT 0.00,
  `total_price` decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `request_id` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `request_items`
--

LOCK TABLES `request_items` WRITE;
/*!40000 ALTER TABLE `request_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `request_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `requests`
--

DROP TABLE IF EXISTS `requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `requests` (
  `id` varchar(255) NOT NULL,
  `requester_id` varchar(255) NOT NULL,
  `requester_name` varchar(255) NOT NULL,
  `requester_avatar` varchar(500) DEFAULT NULL,
  `department` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `total` decimal(10,2) DEFAULT 0.00,
  `items_count` int(11) DEFAULT 0,
  `justification` text DEFAULT NULL,
  `priority` varchar(20) DEFAULT 'media',
  `status` varchar(20) DEFAULT 'pendiente',
  `internal_status` varchar(50) DEFAULT 'INITIAL',
  `date` datetime NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `workflow_id` int(11) DEFAULT NULL,
  `current_step_id` int(11) DEFAULT NULL,
  `cost_center_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `requests`
--

LOCK TABLES `requests` WRITE;
/*!40000 ALTER TABLE `requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_permissions` (
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12),(1,13),(1,14),(1,15),(1,16),(1,17),(1,18),(1,19),(1,20),(1,21),(1,22),(1,23),(2,1),(2,2),(2,3),(2,4),(2,6),(2,7),(2,8),(2,9),(2,10),(2,13),(2,14),(3,1),(3,3),(3,4),(3,8),(3,11),(3,12),(3,13),(4,1),(4,3),(4,4),(4,6),(4,8),(4,11),(4,13);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_system` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','Administrador Total',1,'2025-12-18 11:19:54'),(2,'rrhh','Recursos Humanos',1,'2025-12-18 11:19:54'),(3,'soporte','Soporte IT',1,'2025-12-18 11:19:54'),(4,'empleado','Empleado General',1,'2025-12-18 11:19:54');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL DEFAULT 1,
  `company_name` varchar(100) DEFAULT 'MIDAS Intranet',
  `company_logo` varchar(500) DEFAULT '',
  `primary_color` varchar(20) DEFAULT '#00B74F',
  `secondary_color` varchar(20) DEFAULT '#0F172A',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `allowed_ip_range` varchar(255) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES (1,'MIDAS Intranet','','#00B74F','#0F172A','2026-01-14 18:54:29','');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_comments`
--

DROP TABLE IF EXISTS `ticket_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ticket_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` varchar(255) NOT NULL,
  `author_id` varchar(255) NOT NULL,
  `author_name` varchar(255) NOT NULL,
  `author_avatar` varchar(255) DEFAULT NULL,
  `text` text NOT NULL,
  `is_internal` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  CONSTRAINT `ticket_comments_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `it_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_comments`
--

LOCK TABLES `ticket_comments` WRITE;
/*!40000 ALTER TABLE `ticket_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticket_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_number` varchar(50) DEFAULT NULL,
  `requester_id` int(11) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `priority` enum('baja','media','alta','urgente') DEFAULT 'media',
  `status` enum('nuevo','asignado','en_proceso','esperando','resuelto','cerrado') DEFAULT 'nuevo',
  `assigned_to` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_number` (`ticket_number`),
  KEY `idx_status` (`status`),
  KEY `idx_requester` (`requester_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tickets`
--

LOCK TABLES `tickets` WRITE;
/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'employee',
  `name` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `refresh_token` varchar(255) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `token_version` int(11) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2b$10$AxMXSJ.1S3y9OSJu6oDN0eBD84Qohy23CqbPmvys.Fa46pFj3gKSi','admin','Antonio Andujar','2025-12-06 23:20:37',NULL,'$2b$10$VsY3QJ.cWu2h4kdFN6EdI.wjyBh5HDQAMRlyH.CfRnWjXXTuOtOHe','2026-02-06 03:15:15',1),(3,'Jorddy','$2b$10$AxMXSJ.1S3y9OSJu6oDN0eBD84Qohy23CqbPmvys.Fa46pFj3gKSi','empleado','Jorddy Rosario','2025-12-10 12:23:06',NULL,'$2b$10$z/lPH1JjQ3uH0BFBr8P9OuY1p25wB.2Xgxp3Kd4H5Op4Gm8RDJHKu','2026-02-06 03:14:52',1),(4,'Junior','$2b$10$AxMXSJ.1S3y9OSJu6oDN0eBD84Qohy23CqbPmvys.Fa46pFj3gKSi','soporte','Junior Chalas','2025-12-10 15:40:14',NULL,'$2b$10$iybMqvp7jZNJ1bHJ0jEdweCVVTTLWOoUggqQTbIigFzSTBw9EZIc2','2026-01-28 16:09:25',1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workflow_steps`
--

DROP TABLE IF EXISTS `workflow_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `workflow_steps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workflow_id` int(11) NOT NULL,
  `step_order` int(11) NOT NULL,
  `step_name` varchar(100) NOT NULL,
  `approver_role` varchar(50) DEFAULT NULL,
  `approver_department` varchar(100) DEFAULT NULL,
  `is_conditional` tinyint(1) DEFAULT 0,
  `condition_rule_id` int(11) DEFAULT NULL,
  `sla_hours` int(11) DEFAULT 24,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_id` (`workflow_id`,`step_order`),
  CONSTRAINT `workflow_steps_ibfk_1` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workflow_steps`
--

LOCK TABLES `workflow_steps` WRITE;
/*!40000 ALTER TABLE `workflow_steps` DISABLE KEYS */;
/*!40000 ALTER TABLE `workflow_steps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workflows`
--

DROP TABLE IF EXISTS `workflows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `workflows` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `use_matrix` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workflows`
--

LOCK TABLES `workflows` WRITE;
/*!40000 ALTER TABLE `workflows` DISABLE KEYS */;
/*!40000 ALTER TABLE `workflows` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-06  4:04:37
