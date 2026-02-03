-- College Recommendation System Database Schema

-- Table for storing college information
CREATE TABLE IF NOT EXISTS colleges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    website_url TEXT,
    scholarship_url TEXT,

    -- Cost factors
    annual_cost_min INTEGER,        -- Minimum annual cost
    annual_cost_max INTEGER,        -- Maximum annual cost
    financial_aid_available INTEGER, -- 0-10 scale

    -- Location factors
    state TEXT,
    city TEXT,
    region TEXT,                    -- Northeast, Southeast, Midwest, Southwest, West Coast
    campus_setting TEXT,            -- Urban, Suburban, Rural

    -- Academic factors
    majors TEXT,                    -- Comma-separated list of majors
    academic_reputation INTEGER,    -- 0-10 scale
    faculty_quality INTEGER,        -- 0-10 scale
    avg_class_size INTEGER,

    -- Outcomes
    graduation_rate INTEGER,        -- Percentage
    avg_starting_salary INTEGER,
    job_placement_rate INTEGER,     -- Percentage

    -- Size & culture
    student_population INTEGER,
    campus_culture TEXT,            -- Liberal, Conservative, Diverse, etc.
    safety_rating INTEGER,          -- 0-10 scale

    -- Distance & services
    latitude REAL,
    longitude REAL,
    career_services_rating INTEGER, -- 0-10 scale

    -- Extras
    athletics_division TEXT,        -- D1, D2, D3, NAIA, None
    athletics_rating INTEGER,       -- 0-10 scale
    facilities_rating INTEGER,      -- 0-10 scale

    -- Type
    institution_type TEXT,          -- 4-year, Community College
    accredited INTEGER DEFAULT 1    -- Boolean (1 = yes, 0 = no)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_state ON colleges(state);
CREATE INDEX IF NOT EXISTS idx_region ON colleges(region);
CREATE INDEX IF NOT EXISTS idx_cost ON colleges(annual_cost_min, annual_cost_max);
CREATE INDEX IF NOT EXISTS idx_type ON colleges(institution_type);

-- Table for storing user sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_question INTEGER DEFAULT 0,
    responses TEXT,                 -- JSON string of all answers
    results TEXT,                   -- JSON string of match results
    completed INTEGER DEFAULT 0     -- Boolean (1 = completed, 0 = in progress)
);

-- Index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_session ON user_sessions(session_id);
