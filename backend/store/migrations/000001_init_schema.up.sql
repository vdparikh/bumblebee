CREATE TABLE IF NOT EXISTS campaign_task_instance_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_task_instance_id UUID NOT NULL REFERENCES campaign_task_instances(id),
    task_execution_id UUID,
    executed_by_user_id UUID REFERENCES users(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL,
    output TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
); 