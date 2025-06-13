ALTER TABLE campaign_task_instances
ADD COLUMN connected_system_id UUID REFERENCES connected_systems(id); 