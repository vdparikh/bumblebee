package gcpbucketchecker

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"cloud.google.com/go/storage"
	"github.com/vdparikh/compliance-automation/backend/integrations"
	"github.com/vdparikh/compliance-automation/backend/integrations/common"
	"github.com/vdparikh/compliance-automation/backend/models"
)

type GCPBucketChecker struct{}

func New() *GCPBucketChecker {
	return &GCPBucketChecker{}
}

func (p *GCPBucketChecker) ID() string {
	return "gcp_bucket_checker_v1"
}

func (p *GCPBucketChecker) Name() string {
	return "GCP Storage Bucket Encryption Checker"
}

func (p *GCPBucketChecker) GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration {
	return map[string]models.CheckTypeConfiguration{
		"gcp_bucket_encryption": {
			Label:       "GCP Bucket Default Encryption",
			TargetType:  "bucket",
			TargetLabel: "GCP Storage Bucket",
			Parameters: []models.ParameterDefinition{
				{
					Name:     "bucketName",
					Label:    "Bucket Name",
					Type:     "text",
					Required: true,
					HelpText: "The name of the GCP storage bucket to check.",
				},
			},
		},
	}
}

func (p *GCPBucketChecker) ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error) {
	if checkTypeKey != "gcp_bucket_encryption" {
		return common.ExecutionResult{Status: common.StatusError, Output: "Unsupported check type"}, fmt.Errorf("unsupported check type: %s", checkTypeKey)
	}
	bucketName, ok := ctx.TaskInstance.Parameters["bucketName"].(string)
	if !ok || bucketName == "" {
		return common.ExecutionResult{Status: common.StatusError, Output: "Missing bucketName parameter"}, fmt.Errorf("missing bucketName parameter")
	}
	ctxGo := context.Background()
	client, err := storage.NewClient(ctxGo)
	if err != nil {
		return common.ExecutionResult{Status: common.StatusFailed, Output: err.Error()}, err
	}
	defer client.Close()
	bucket := client.Bucket(bucketName)
	attrs, err := bucket.Attrs(ctxGo)
	if err != nil {
		return common.ExecutionResult{Status: common.StatusFailed, Output: err.Error()}, err
	}
	result := map[string]interface{}{
		"bucket":          bucketName,
		"location":        attrs.Location,
		"default_kms_key": attrs.Encryption.DefaultKMSKeyName,
		"created":         attrs.Created.Format(time.RFC3339),
	}
	status := common.StatusSuccess
	if attrs.Encryption == nil || attrs.Encryption.DefaultKMSKeyName == "" {
		status = common.StatusFailed
		result["error"] = "No default encryption configured"
	}
	jsonOut, _ := json.Marshal(result)
	return common.ExecutionResult{Status: status, Output: string(jsonOut)}, nil
}

var _ integrations.IntegrationPlugin = (*GCPBucketChecker)(nil)
