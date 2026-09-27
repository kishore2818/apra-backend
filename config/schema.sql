-- PostgreSQL / Supabase Schema for APRA Association
-- Database: PostgreSQL (Supabase)

CREATE TABLE IF NOT EXISTS association_info (
    id SERIAL PRIMARY KEY,
    name_tamil TEXT NOT NULL,
    name_english TEXT NOT NULL,
    short_name VARCHAR(20) DEFAULT 'APRA',
    regd_no VARCHAR(50) DEFAULT 'Regd. No. 25/2023',
    address_tamil TEXT,
    address_english TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS association_heads (
    id SERIAL PRIMARY KEY,
    role VARCHAR(100) NOT NULL,
    role_tamil VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    category VARCHAR(50) DEFAULT 'Executive',
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    application_no INT UNIQUE NOT NULL,
    receipt_no INT UNIQUE NOT NULL,
    submission_date DATE DEFAULT CURRENT_DATE,
    resident_type VARCHAR(20) CHECK (resident_type IN ('Owner', 'Tenant')),
    full_name VARCHAR(200) NOT NULL,
    age INT,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
    layout_plot_no VARCHAR(50),
    door_no_old VARCHAR(50),
    door_no_new VARCHAR(50),
    street TEXT NOT NULL,
    mailing_address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    landline VARCHAR(30),
    email VARCHAR(150),
    admission_fee INT DEFAULT 100,
    status VARCHAR(50) DEFAULT 'Pending Verification',
    rejection_reason TEXT,
    declaration_accepted BOOLEAN DEFAULT TRUE,
    photo_url TEXT,
    signature_name VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_members (
    id SERIAL PRIMARY KEY,
    member_id INT REFERENCES members(id) ON DELETE CASCADE,
    application_no INT,
    name VARCHAR(200) NOT NULL,
    gender VARCHAR(20),
    relationship VARCHAR(50),
    age INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Association Heads extracted from Document 1
INSERT INTO association_heads (role, role_tamil, name, phone, category) VALUES
('President', 'தலைவர்', 'Mr. K.S. Murugesan', '9442636020', 'Executive'),
('Vice-President - 1', 'துணைத் தலைவர் 1', 'Mr. J.H. Benzigar', '9488960361', 'Executive'),
('Vice-President - 2', 'துணைத் தலைவர் 2', 'Mr. T.V.S. Pillai', '9443117331', 'Executive'),
('Secretary', 'செயலாளர்', 'Mr. K. Perumal', '9994911733', 'Executive'),
('Treasurer', 'பொருளாளர்', 'Mr. D. Vivekanandan', '9443894258', 'Executive'),
('Joint Secretary', 'இணைச் செயலாளர்', 'Mr. J. Nelson', '9444269232', 'Secretaries'),
('Joint Secretary', 'இணைச் செயலாளர்', 'Mr. S. Mohamed Iqbal', '8754295758', 'Secretaries'),
('Legal Advisor', 'சட்ட ஆலோசகர்', 'Adv. P. Paramadhas', '9443261005', 'Advisors'),
('Legal Advisor', 'சட்ட ஆலோசகர்', 'Adv. Jeen Jacko', '9443432606', 'Advisors'),
('General Advisor', 'பொது ஆலோசகர்', 'Mr. C.M. Ivin', '9443483005', 'Advisors'),
('General Advisor', 'பொது ஆலோசகர்', 'Er. A. Bernard', '9443368578', 'Advisors'),
('General Advisor', 'பொது ஆலோசகர்', 'Mr. M.S. Selvaraj', '944126028', 'Advisors')
ON CONFLICT DO NOTHING;
