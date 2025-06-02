package models

import "time"

type Comment struct {
	ID                     string  `json:"id" db:"id"`
	TaskID                 *string `json:"taskId,omitempty" db:"task_id"`                                   
	CampaignTaskInstanceID *string `json:"campaignTaskInstanceId,omitempty" db:"campaign_task_instance_id"` 
	UserID                 string  `json:"userId" db:"user_id"`                                             
	UserName               string  `json:"userName,omitempty" db:"user_name"`                               
	Text                   string  `json:"text" db:"text"`
	TaskTitle              *string `json:"taskTitle,omitempty"` 

	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}
