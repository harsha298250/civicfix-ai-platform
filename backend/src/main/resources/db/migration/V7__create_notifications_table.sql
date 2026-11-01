-- Flyway Migration V7: Create Persistent Notifications Table
-- Preserves all existing tables (V1-V6) and data without disruption.

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
    reference_id VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    severity VARCHAR(30) NOT NULL DEFAULT 'INFO',
    target_url VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Fast lookup for unread count badge & chronological paginated lists per recipient
CREATE INDEX idx_notifications_recipient_read_created 
ON notifications(recipient_id, is_read, created_at DESC);

-- Fast lookup for notifications linked to specific complaints
CREATE INDEX idx_notifications_complaint 
ON notifications(complaint_id);

-- Foreign key indexes
CREATE INDEX idx_notifications_recipient 
ON notifications(recipient_id);

CREATE INDEX idx_notifications_actor 
ON notifications(actor_id);
