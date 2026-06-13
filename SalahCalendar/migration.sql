-- ============================================================
-- SalahCalendar — Database Migration
-- Run this SQL to create the new tables required for the
-- account management system.
-- ============================================================

-- NOTE: The users and email_otps tables should already exist.
-- If not, create them first:

-- CREATE TABLE users (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   email VARCHAR(255) UNIQUE NOT NULL,
--   name VARCHAR(255),
--   city VARCHAR(100),
--   country VARCHAR(100),
--   phone VARCHAR(50),
--   auth_provider VARCHAR(50),
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE email_otps (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   email VARCHAR(255),
--   code VARCHAR(10),
--   expiry DATETIME,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );


-- ── New Table: salah_calendars ──────────────────────────────
-- Stores dynamic calendar configurations per user.
CREATE TABLE IF NOT EXISTS salah_calendars (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  calendar_key VARCHAR(36) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  params JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_calendar_key (calendar_key),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ── New Table: access_logs ──────────────────────────────────
-- Records access events when a dynamic calendar is accessed.
CREATE TABLE IF NOT EXISTS access_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  calendar_id BIGINT NOT NULL,
  user_ip VARCHAR(45),
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  details JSON,
  FOREIGN KEY (calendar_id) REFERENCES salah_calendars(id) ON DELETE CASCADE,
  INDEX idx_calendar_id (calendar_id),
  INDEX idx_accessed_at (accessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ── New Table: user_sessions ───────────────────────────────
-- Session tokens for persistent 24h login.
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_token (session_token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ── New Table: magic_links ─────────────────────────────────
-- Magic links for one-click sign-in from email.
CREATE TABLE IF NOT EXISTS magic_links (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(128) UNIQUE NOT NULL,
  expiry DATETIME NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_expiry (expiry)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
