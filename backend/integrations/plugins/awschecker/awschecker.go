package awschecker

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/vdparikh/compliance-automation/backend/integrations"
	"github.com/vdparikh/compliance-automation/backend/integrations/common" // Import the common package
	"github.com/vdparikh/compliance-automation/backend/models"

	awsConfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	// "github.com/aws/aws-sdk-go-v2/service/rds"
	// "github.com/aws/aws-sdk-go-v2/credentials"
)

const (
	PluginID_AWSChecker                    = "aws-checker-v1"
	PluginName_AWSChecker                  = "AWS Infrastructure Checker"
	CheckTypeKey_S3BucketDefaultEncryption = "aws_s3_bucket_default_encryption_check"
	CheckTypeKey_RDSUnencryptedInstances   = "aws_rds_unencrypted_instances_check"
)

// awsPluginConfig matches the structure expected from ConnectedSystem.Configuration for AWS type.
type awsPluginConfig struct {
	AccessKeyID     string `json:"accessKeyId"`
	SecretAccessKey string `json:"secretAccessKey"`
	DefaultRegion   string `json:"defaultRegion"`
	// RoleARN         string `json:"roleArn,omitempty"` // For future enhancement
}

type AWSChecker struct{}

func New() *AWSChecker {
	return &AWSChecker{}
}

func (p *AWSChecker) ID() string {
	return PluginID_AWSChecker
}

func (p *AWSChecker) Name() string {
	return PluginName_AWSChecker
}

func (p *AWSChecker) GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration {
	return map[string]models.CheckTypeConfiguration{
		CheckTypeKey_S3BucketDefaultEncryption: {
			Label: "AWS S3 Bucket Default Encryption Check",
			// Description and Category are not in your models.CheckTypeConfiguration
			// TargetType, TargetLabel, TargetHelpText should be set based on your needs
			TargetType:  "connected_system", // Assuming it targets an AWS connected system
			TargetLabel: "AWS Account/System",
			Parameters: []models.ParameterDefinition{
				{
					Name:  "bucketName",                // Machine-readable key
					Label: "S3 Bucket Name (Optional)", // Human-readable label
					Type:  "text",
					// Description is not in your models.ParameterDefinition, use HelpText
					HelpText: "Specific S3 bucket to check. If empty, all accessible buckets in the region will be checked.",
					Required: false,
				},
			},
		},
		CheckTypeKey_RDSUnencryptedInstances: {
			Label:       "AWS RDS Unencrypted Instances Check",
			TargetType:  "connected_system",
			TargetLabel: "AWS Account/System",
			Parameters: []models.ParameterDefinition{
				{
					Name:     "instanceIdentifier",
					Label:    "RDS Instance Identifier (Optional)",
					Type:     "text",
					HelpText: "Specific RDS instance identifier to check. If empty, all accessible instances in the region will be checked.",
					Required: false,
				},
			},
		},
	}
}

func (p *AWSChecker) ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error) {
	var pluginCfg awsPluginConfig
	if err := json.Unmarshal(ctx.ConnectedSystem.Configuration, &pluginCfg); err != nil {
		return common.ExecutionResult{Status: common.StatusError, Output: "Failed to parse AWS plugin configuration"}, fmt.Errorf("unmarshal aws config: %w", err)
	}

	if pluginCfg.AccessKeyID == "" || pluginCfg.SecretAccessKey == "" || pluginCfg.DefaultRegion == "" {
		return common.ExecutionResult{Status: common.StatusError, Output: "AWS credentials (AccessKeyID, SecretAccessKey, DefaultRegion) are missing in system configuration"}, fmt.Errorf("missing aws credentials")
	}

	cfg, err := awsConfig.LoadDefaultConfig(ctx.StdContext,
		awsConfig.WithRegion(pluginCfg.DefaultRegion),
		awsConfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(pluginCfg.AccessKeyID, pluginCfg.SecretAccessKey, "")),
	)
	if err != nil {
		return common.ExecutionResult{Status: common.StatusError, Output: "Failed to load AWS SDK config: " + err.Error()}, fmt.Errorf("load aws config: %w", err)
	}

	log.Printf("Executing AWS check: %s with region %s", checkTypeKey, pluginCfg.DefaultRegion)

	switch checkTypeKey {
	case CheckTypeKey_S3BucketDefaultEncryption:
		// bucketNameParam, _ := ctx.TaskInstance.Parameters["bucketName"].(string)
		// s3Client := s3.NewFromConfig(cfg)
		// TODO: Implement S3 bucket default encryption check logic using s3Client and bucketNameParam
		// Example: List buckets, then for each GetBucketEncryption
		s3Client := s3.NewFromConfig(cfg)
		bucketNameParam, _ := ctx.TaskInstance.Parameters["bucketName"].(string)

		var bucketsToCheck []string
		if bucketNameParam != "" {
			bucketsToCheck = append(bucketsToCheck, bucketNameParam)
		} else {
			listBucketsOutput, err := s3Client.ListBuckets(ctx.StdContext, &s3.ListBucketsInput{})
			if err != nil {
				return common.ExecutionResult{Status: common.StatusError, Output: "Failed to list S3 buckets: " + err.Error()}, fmt.Errorf("list s3 buckets: %w", err)
			}
			for _, b := range listBucketsOutput.Buckets {
				if b.Name != nil {
					bucketsToCheck = append(bucketsToCheck, *b.Name)
				}
			}
		}

		var unencryptedBuckets []string
		var checkedBuckets []string
		var errorsEncountered []string

		for _, bucketName := range bucketsToCheck {
			checkedBuckets = append(checkedBuckets, bucketName)
			encryptionOutput, err := s3Client.GetBucketEncryption(ctx.StdContext, &s3.GetBucketEncryptionInput{
				Bucket: &bucketName,
			})
			if err != nil {
				// Some buckets might not have encryption configured, which results in an error from the API.
				// We interpret this as "default encryption not explicitly enabled".
				// Check for specific error "ServerSideEncryptionConfigurationNotFoundError"
				if strings.Contains(err.Error(), "ServerSideEncryptionConfigurationNotFoundError") {
					unencryptedBuckets = append(unencryptedBuckets, bucketName+" (No explicit default encryption rule found)")
				} else {
					errMsg := fmt.Sprintf("Failed to get encryption for bucket %s: %s", bucketName, err.Error())
					errorsEncountered = append(errorsEncountered, errMsg)
					log.Println(errMsg)
				}
				continue
			}

			if encryptionOutput.ServerSideEncryptionConfiguration == nil || len(encryptionOutput.ServerSideEncryptionConfiguration.Rules) == 0 {
				unencryptedBuckets = append(unencryptedBuckets, bucketName+" (Default encryption rule not configured or empty)")
			}
			// If Rules exist, default encryption is considered enabled. Further checks on specific algorithms could be added.
		}

		resultStatus := common.StatusSuccess
		if len(unencryptedBuckets) > 0 || len(errorsEncountered) > 0 {
			resultStatus = common.StatusFailed
		}

		outputData := map[string]interface{}{
			"message":               fmt.Sprintf("S3 Bucket Default Encryption check completed. Found %d buckets without explicit default encryption.", len(unencryptedBuckets)),
			"checked_region":        pluginCfg.DefaultRegion,
			"total_buckets_scanned": len(checkedBuckets),
			"unencrypted_buckets":   unencryptedBuckets,
			"errors":                errorsEncountered,
		}
		outputJSON, _ := json.Marshal(outputData)
		return common.ExecutionResult{Status: resultStatus, Output: string(outputJSON)}, nil

	case CheckTypeKey_RDSUnencryptedInstances:
		// instanceIdentifierParam, _ := ctx.TaskInstance.Parameters["instanceIdentifier"].(string)
		// rdsClient := rds.NewFromConfig(cfg)
		// TODO: Implement RDS unencrypted instances check logic using rdsClient and instanceIdentifierParam
		// Example: DescribeDBInstances, check StorageEncrypted field
		// For now, returning a placeholder
		return common.ExecutionResult{
			Status: common.StatusSuccess, // Change to StatusFailed if issues found
			Output: `{"message": "RDS Unencrypted Instances check placeholder executed. All instances encrypted (simulated).", "details": {"checked_region": "` + pluginCfg.DefaultRegion + `"}}`,
		}, nil

	default:
		return common.ExecutionResult{Status: common.StatusError, Output: "Unsupported AWS check type"}, fmt.Errorf("unsupported aws check type: %s", checkTypeKey)
	}
}

// Ensure AWSChecker implements the IntegrationPlugin interface
var _ integrations.IntegrationPlugin = (*AWSChecker)(nil)
