CREATE TABLE management_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    region VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    management_company_id UUID NOT NULL REFERENCES management_companies(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL, -- admin, manager, field_manager, vendor, resident
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_company ON users(management_company_id);

CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    management_company_id UUID NOT NULL REFERENCES management_companies(id),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    unit_count INT,
    assigned_manager_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100), -- gate, pool, irrigation, roof, fence, etc
    install_date DATE,
    warranty_expiration DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assets_community ON assets(community_id);

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    management_company_id UUID NOT NULL REFERENCES management_companies(id),
    company_name VARCHAR(255) NOT NULL,
    service_category VARCHAR(100), -- landscaping, pool, electrical, roofing
    insurance_expiration DATE,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    management_company_id UUID NOT NULL REFERENCES management_companies(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    asset_id UUID REFERENCES assets(id),
    created_by_user_id UUID REFERENCES users(id),
    assigned_vendor_id UUID REFERENCES vendors(id),
    
    category VARCHAR(100), -- landscaping, storm, pool, gate
    priority VARCHAR(50), -- low, medium, high, emergency
    status VARCHAR(50) NOT NULL, -- new, assigned, in_progress, completed, closed
    
    title VARCHAR(255),
    description TEXT,
    sla_due_at TIMESTAMP,
    completed_at TIMESTAMP,
    closed_at TIMESTAMP,
    
    estimated_cost NUMERIC(12,2),
    actual_cost NUMERIC(12,2),
    
    storm_event_id UUID,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tickets_company ON maintenance_tickets(management_company_id);
CREATE INDEX idx_tickets_community ON maintenance_tickets(community_id);
CREATE INDEX idx_tickets_status ON maintenance_tickets(status);
CREATE INDEX idx_tickets_vendor ON maintenance_tickets(assigned_vendor_id);
CREATE INDEX idx_tickets_storm ON maintenance_tickets(storm_event_id);

CREATE TABLE ticket_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
    uploaded_by_user_id UUID REFERENCES users(id),
    file_url TEXT NOT NULL,
    photo_type VARCHAR(50), -- before, after, inspection, storm_damage
    created_at TIMESTAMP DEFAULT NOW()
);
 
CREATE TABLE ticket_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by_user_id UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE storm_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),
    name VARCHAR(255), -- Hurricane Milton 2026
    start_date DATE,
    end_date DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recurring_maintenance_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),
    asset_id UUID REFERENCES assets(id),
    vendor_id UUID REFERENCES vendors(id),
    title VARCHAR(255),
    category VARCHAR(100),
    frequency VARCHAR(50), -- weekly, biweekly, monthly
    checklist JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pool_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),
    vendor_id UUID REFERENCES vendors(id),
    chlorine_level NUMERIC(5,2),
    ph_level NUMERIC(5,2),
    inspection_notes TEXT,
    photo_url TEXT,
    logged_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vendor_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    management_company_id UUID NOT NULL,
    
    total_tickets INT DEFAULT 0,
    avg_resolution_hours NUMERIC(10,2),
    sla_compliance_rate NUMERIC(5,2),
    reopen_rate NUMERIC(5,2),
    total_spend NUMERIC(14,2),
    
    last_calculated_at TIMESTAMP
);