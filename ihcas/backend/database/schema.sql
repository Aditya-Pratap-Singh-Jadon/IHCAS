-- schema.sql

CREATE TABLE USER (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('STUDENT', 'ADMIN', 'WARDEN') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE STUDENT (
    student_id INT PRIMARY KEY,
    reg_no VARCHAR(50) UNIQUE NOT NULL,
    cgpa DECIMAL(4,2),
    academic_rank INT,
    gender ENUM('MALE', 'FEMALE', 'OTHER'),
    department VARCHAR(100),
    year INT,
    phone VARCHAR(20),
    allocation_status ENUM('PENDING', 'CONFIRMED', 'LOCKED', 'CANCELLED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES USER(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ADMIN (
    admin_id INT PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    designation VARCHAR(100),
    phone VARCHAR(20),
    FOREIGN KEY (admin_id) REFERENCES USER(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE WARDEN (
    warden_id INT PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    hostel_id INT, -- FK added later to avoid circular dependency
    phone VARCHAR(20),
    FOREIGN KEY (warden_id) REFERENCES USER(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE COMPATIBILITY_PROFILE (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT UNIQUE NOT NULL,
    sleep_schedule VARCHAR(50),
    study_habits VARCHAR(50),
    cleanliness VARCHAR(50),
    noise_tolerance VARCHAR(50),
    social_preference VARCHAR(50),
    temperature_preference VARCHAR(50),
    guest_preference VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE HOSTEL (
    hostel_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    location VARCHAR(255),
    hostel_type VARCHAR(50),
    total_capacity INT NOT NULL,
    warden_id INT,
    FOREIGN KEY (warden_id) REFERENCES WARDEN(warden_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Add hostel_id foreign key to WARDEN now that HOSTEL is created
ALTER TABLE WARDEN
ADD CONSTRAINT fk_warden_hostel
FOREIGN KEY (hostel_id) REFERENCES HOSTEL(hostel_id) ON DELETE SET NULL;

CREATE TABLE ROOM_TYPE (
    room_type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    has_ac BOOLEAN DEFAULT FALSE,
    description TEXT
) ENGINE=InnoDB;

CREATE TABLE ROOM (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    floor INT,
    room_type_id INT NOT NULL,
    capacity INT NOT NULL,
    occupied_beds INT DEFAULT 0,
    status ENUM('AVAILABLE', 'PARTIALLY_FILLED', 'FULL', 'MAINTENANCE') DEFAULT 'AVAILABLE',
    FOREIGN KEY (hostel_id) REFERENCES HOSTEL(hostel_id) ON DELETE CASCADE,
    FOREIGN KEY (room_type_id) REFERENCES ROOM_TYPE(room_type_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE COUNSELLING_SESSION (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    academic_year VARCHAR(20) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    slot_duration_minutes INT NOT NULL,
    status VARCHAR(50),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES ADMIN(admin_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE COUNSELLING_SLOT (
    slot_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT UNIQUE NOT NULL, -- NOTE: Diagram has UQ, might be overly restrictive across years
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status VARCHAR(50),
    is_active BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (session_id) REFERENCES COUNSELLING_SESSION(session_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ALLOCATION (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    slot_id INT,
    room_id INT NOT NULL,
    allocation_type ENUM('SELF', 'AI') NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'LOCKED', 'CANCELLED') DEFAULT 'PENDING',
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    locked_at DATETIME,
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES COUNSELLING_SLOT(slot_id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES ROOM(room_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE STUDENT_ROOMMATE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    allocation_id INT NOT NULL,
    student_id INT NOT NULL,
    roommate_id INT NOT NULL,
    otp_id INT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at DATETIME,
    FOREIGN KEY (allocation_id) REFERENCES ALLOCATION(allocation_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (roommate_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE OTP_VERIFICATION (
    otp_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    roommate_reg_no VARCHAR(50) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    destination_contact VARCHAR(255),
    delivery_channel VARCHAR(20) DEFAULT 'EMAIL',
    delivery_status VARCHAR(20) DEFAULT 'PENDING',
    status VARCHAR(20),
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME,
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE STUDENT_ROOMMATE 
ADD CONSTRAINT fk_student_roommate_otp 
FOREIGN KEY (otp_id) REFERENCES OTP_VERIFICATION(otp_id) ON DELETE SET NULL;

CREATE TABLE AI_RECOMMENDATION (
    recommendation_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    room_id INT NOT NULL,
    score DECIMAL(5,2),
    reason TEXT,
    model_version VARCHAR(50),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES ROOM(room_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE NOTIFICATION (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('SLOT_UPDATE', 'ALLOCATION', 'LEAVE', 'ROOM_CHANGE', 'MESS', 'COMPLAINT', 'ANNOUNCEMENT') NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE LEAVE_REQUEST (
    leave_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CLOSED') DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    reviewed_by INT,
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES WARDEN(warden_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE ROOM_CHANGE_REQUEST (
    change_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    current_room_id INT NOT NULL,
    requested_room_type VARCHAR(50),
    reason TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CLOSED') DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    reviewed_by INT,
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (current_room_id) REFERENCES ROOM(room_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES WARDEN(warden_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE MESS_CHANGE_REQUEST (
    mess_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    current_mess VARCHAR(100),
    requested_mess VARCHAR(100),
    reason TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CLOSED') DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    reviewed_by INT,
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES WARDEN(warden_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE COMPLAINT (
    complaint_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    category VARCHAR(50),
    description TEXT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'LOW',
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CLOSED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by INT,
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES WARDEN(warden_id) ON DELETE SET NULL
) ENGINE=InnoDB;
