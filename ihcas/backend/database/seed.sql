-- seed.sql
USE ihcas_db;

-- Users
INSERT INTO USER (name, email, password_hash, role) VALUES 
('Admin User', 'admin@univ.edu', 'hashedpassword123', 'ADMIN'),
('Warden Smith', 'warden1@univ.edu', 'hashedpassword123', 'WARDEN'),
('John Doe', 'john.doe@univ.edu', 'hashedpassword123', 'STUDENT'),
('Jane Roe', 'jane.roe@univ.edu', 'hashedpassword123', 'STUDENT');

-- Admins, Wardens, Students
INSERT INTO ADMIN (admin_id, employee_id, designation, phone) VALUES 
(1, 'EMP001', 'Chief Administrator', '1234567890');

INSERT INTO WARDEN (warden_id, employee_id, phone) VALUES 
(2, 'EMP002', '0987654321');

INSERT INTO STUDENT (student_id, reg_no, cgpa, academic_rank, gender, department, year, phone) VALUES 
(3, 'REG2023001', 9.5, 1, 'MALE', 'Computer Science', 2, '1111111111'),
(4, 'REG2023002', 9.2, 2, 'FEMALE', 'Electrical Engineering', 2, '2222222222');

-- Hostels
INSERT INTO HOSTEL (name, gender, location, hostel_type, total_capacity, warden_id) VALUES 
('Boys Hostel A', 'MALE', 'North Campus', 'UG', 100, 2);

-- Update Warden with Hostel
UPDATE WARDEN SET hostel_id = 1 WHERE warden_id = 2;

-- Room Types
INSERT INTO ROOM_TYPE (type_name, capacity, has_ac, description) VALUES 
('2_BED_NON_AC', 2, FALSE, 'Standard 2-bed room without AC'),
('1_BED_AC', 1, TRUE, 'Premium 1-bed room with AC');

-- Rooms
INSERT INTO ROOM (hostel_id, room_number, floor, room_type_id, capacity) VALUES 
(1, '101', 1, 1, 2),
(1, '102', 1, 1, 2);

-- Counselling Session & Slot
INSERT INTO COUNSELLING_SESSION (academic_year, start_date, end_date, slot_duration_minutes, status, created_by) VALUES 
('2024-2025', '2024-05-01 09:00:00', '2024-05-05 17:00:00', 3, 'ACTIVE', 1);

INSERT INTO COUNSELLING_SLOT (session_id, student_id, start_time, end_time, status, is_active) VALUES 
(1, 3, '2024-05-01 09:00:00', '2024-05-01 09:03:00', 'PENDING', TRUE);
