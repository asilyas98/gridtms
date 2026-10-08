-- Trucking TMS Database Schema (Phase 1)
-- Supports Load Board Import, HOS/Driver Availability checks, and Route/Stop Optimization.
-- Built for PostgreSQL on Supabase with automatic timestamps, updated_at tracks, and Soft Deletes.

-- Helper for trigger-based updated_at column automatic updates in PostgreSQL/Supabase
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Locations Table
CREATE TABLE locations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Shipper', 'Consignee', 'Both', 'Drop Yard', 'Terminal'
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip VARCHAR(10) NOT NULL,
    country VARCHAR(100) DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    operating_hours VARCHAR(100),
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    gate_code VARCHAR(50),
    overnight_parking BOOLEAN DEFAULT FALSE,
    restrooms_available BOOLEAN DEFAULT FALSE,
    scale_on_site BOOLEAN DEFAULT FALSE,
    forklift_on_site BOOLEAN DEFAULT FALSE,
    twic_required BOOLEAN DEFAULT FALSE,
    ppe_required TEXT, -- JSON array of safety gear e.g. ["Steel-toe Boots", "High-Vis Vest"]
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TRIGGER set_timestamp_locations
BEFORE UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- 2. Customers Table
CREATE TABLE customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Prospect', -- 'Active', 'On Hold', 'Inactive', 'Prospect'
    credit_limit DECIMAL(12, 2) DEFAULT 5000.00,
    outstanding_balance DECIMAL(12, 2) DEFAULT 0.00,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip VARCHAR(10) NOT NULL,
    country VARCHAR(100) DEFAULT 'USA',
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    dba VARCHAR(150),
    mc_number VARCHAR(20),
    dot_number VARCHAR(20),
    tax_id VARCHAR(20),
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    billing_delivery_method VARCHAR(50) DEFAULT 'Email',
    require_po BOOLEAN DEFAULT FALSE,
    require_pod BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TRIGGER set_timestamp_customers
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- 3. Trucks Table
CREATE TABLE trucks (
    id VARCHAR(50) PRIMARY KEY,
    unit_number VARCHAR(50) UNIQUE NOT NULL,
    make_model VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Sleeper', 'Daycab', 'Box Truck'
    current_location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Available', -- 'Available', 'In Use', 'Maintenance'
    pm_status VARCHAR(50) DEFAULT 'Current', -- 'Current', 'Due', 'Overdue'
    registration_expiry DATE,
    annual_inspection_expiry DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TRIGGER set_timestamp_trucks
BEFORE UPDATE ON trucks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- 4. Drivers Table
CREATE TABLE drivers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    current_location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Available', -- 'Available', 'On Load', 'On Restart', 'Off Duty'
    cdl_class VARCHAR(5) NOT NULL DEFAULT 'A', -- 'A', 'B', 'C'
    endorsements TEXT, -- JSON array e.g. ["Hazmat", "Tanker"]
    score INT DEFAULT 100,
    truck_id VARCHAR(50) REFERENCES trucks(id) ON DELETE SET NULL,
    medical_card_expiry DATE,
    cdl_expiry DATE,
    drug_test_date DATE,
    
    -- Hours Of Service (HOS) Tracking (Phase 1 Essential)
    hos_duty_status VARCHAR(50) DEFAULT 'Off Duty', -- 'On Duty', 'Off Duty', 'Driving', 'Sleeper'
    hos_drive_time_hours DECIMAL(4, 2) DEFAULT 11.00, -- Max 11 hours of driver time
    hos_duty_time_hours DECIMAL(4, 2) DEFAULT 14.00, -- Max 14 hours total shift shift time
    hos_cycle_time_hours DECIMAL(4, 2) DEFAULT 70.00, -- Max 70 hours in 8 days cycle
    hos_rest_break_required BOOLEAN DEFAULT FALSE,   -- Triggers when driving block exceeds 8h
    hos_violations INT DEFAULT 0,
    last_status_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TRIGGER set_timestamp_drivers
BEFORE UPDATE ON drivers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- 5. External Load Board Listings (Load Board Import Model)
CREATE TABLE load_board_listings (
    id VARCHAR(50) PRIMARY KEY,
    broker_name VARCHAR(150) NOT NULL,
    broker_rating DECIMAL(3, 2) DEFAULT 5.0,
    origin_city VARCHAR(100) NOT NULL,
    origin_state VARCHAR(2) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    destination_state VARCHAR(2) NOT NULL,
    pickup_date DATE NOT NULL,
    delivery_date DATE NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    miles DECIMAL(8, 2) NOT NULL,
    commodity VARCHAR(100) NOT NULL,
    weight_lbs INT NOT NULL,
    equipment_type VARCHAR(50) NOT NULL, -- 'Dry Van', 'Reefer', 'Flatbed'
    source_platform VARCHAR(50) DEFAULT 'DAT', -- 'DAT', 'Truckstop', 'GridConnect'
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TRIGGER set_timestamp_load_board_listings
BEFORE UPDATE ON load_board_listings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- 6. Loads Table (Operational Load Board & Statuses)
CREATE TABLE loads (
    id VARCHAR(50) PRIMARY KEY,
    load_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Created', -- 'Created', 'Dispatched', 'At Pickup', 'Loaded', 'In Transit', 'Delivered', 'Cancelled'
    priority VARCHAR(20) DEFAULT 'Medium', -- 'Critical', 'High', 'Medium', 'Low'
    priority_score DECIMAL(5, 2) DEFAULT 0.0, -- Calculated load scoring ratio
    customer_id VARCHAR(50) REFERENCES customers(id),
    origin_id VARCHAR(50) REFERENCES locations(id),
    destination_id VARCHAR(50) REFERENCES locations(id),
    pickup_date TIMESTAMP NOT NULL,
    delivery_date TIMESTAMP NOT NULL,
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE SET NULL,
    truck_id VARCHAR(50) REFERENCES trucks(id) ON DELETE SET NULL,
    rate DECIMAL(10, 2) NOT NULL,
    miles DECIMAL(8, 2) NOT NULL,
    commodity VARCHAR(100) NOT NULL,
    weight_lbs INT NOT NULL,
    equipment_type VARCHAR(50) NOT NULL,
    customer_po VARCHAR(100),
    bol_number VARCHAR(100),
    service_level VARCHAR(50) DEFAULT 'Standard', -- 'Standard', 'Expedited', 'Team'
    sent_to_app BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TRIGGER set_timestamp_loads
BEFORE UPDATE ON loads
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- 7. Load Stops Table (Sequenced stops for Multi-stop Loads)
CREATE TABLE load_stops (
    id VARCHAR(50) PRIMARY KEY,
    load_id VARCHAR(50) REFERENCES loads(id) ON DELETE CASCADE,
    location_id VARCHAR(50) REFERENCES locations(id),
    stop_sequence INT NOT NULL, -- Order of visiting
    stop_type VARCHAR(20) NOT NULL, -- 'Pickup', 'Delivery', 'Layover', 'Via'
    scheduled_arrival TIMESTAMP NOT NULL,
    scheduled_departure TIMESTAMP,
    actual_arrival TIMESTAMP,
    actual_departure TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Arrived', 'Departed'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TRIGGER set_timestamp_load_stops
BEFORE UPDATE ON load_stops
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- 8. Activity Log
CREATE TABLE load_activity_logs (
    id VARCHAR(50) PRIMARY KEY,
    load_id VARCHAR(50) REFERENCES loads(id) ON DELETE CASCADE,
    log_user VARCHAR(100) NOT NULL DEFAULT 'Operations Admin',
    action_text TEXT NOT NULL,
    log_type VARCHAR(50) NOT NULL, -- 'status', 'document', 'financial', 'system', 'edit'
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TRIGGER set_timestamp_load_activity_logs
BEFORE UPDATE ON load_activity_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- 9. Driver Settlements Table (Phase 5: Financial Operations & Calculation Logic)
CREATE TABLE driver_settlements (
    id VARCHAR(50) PRIMARY KEY,
    settlement_number VARCHAR(50) UNIQUE NOT NULL,
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE RESTRICT,
    load_id VARCHAR(50) REFERENCES loads(id) ON DELETE SET NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    pay_method VARCHAR(50) NOT NULL, -- 'CPM', 'PERCENTAGE', 'FLAT'
    pay_rate DECIMAL(10, 2) NOT NULL,
    base_pay DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    fuel_surcharge DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    detention_pay DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    fuel_advance_deduction DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    insurance_deduction DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    eld_fee_deduction DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    gross_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    deductions DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    net_pay DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Processing', 'Issued'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TRIGGER set_timestamp_driver_settlements
BEFORE UPDATE ON driver_settlements
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

