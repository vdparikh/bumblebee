package executor

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

// AWSSecurityGroupCheckExecutor implements the CheckExecutor interface for checking AWS security group configurations
type AWSSecurityGroupCheckExecutor struct{}

// awsSecurityGroupSystemConfig defines the expected structure of the ConnectedSystem configuration for this check
type awsSecurityGroupSystemConfig struct {
	AccessKey string `json:"access_key"`
	SecretKey string `json:"secret_key"`
	Region    string `json:"region"`
}

// awsSecurityGroupTaskParams defines the expected structure of the TaskInstance parameters for this check
type awsSecurityGroupTaskParams struct {
	SecurityGroupID string               `json:"security_group_id"`
	ExpectedRules   []types.IpPermission `json:"expected_rules"`
}

// SecurityRule represents an expected security group rule
type SecurityRule struct {
	Protocol string `json:"protocol"`
	FromPort int32  `json:"from_port"`
	ToPort   int32  `json:"to_port"`
	CIDR     string `json:"cidr"`
}

// ValidateParameters checks if the provided task parameters and system configuration are valid
func (e *AWSSecurityGroupCheckExecutor) ValidateParameters(params map[string]interface{}, systemConfig json.RawMessage) (bool, string, error) {
	var taskP awsSecurityGroupTaskParams
	paramsBytes, err := json.Marshal(params)
	if err != nil {
		return false, "", fmt.Errorf("failed to marshal parameters: %v", err)
	}
	if err := json.Unmarshal(paramsBytes, &taskP); err != nil {
		return false, "", fmt.Errorf("failed to parse parameters: %v", err)
	}

	var sysConfig awsSecurityGroupSystemConfig
	if err := json.Unmarshal(systemConfig, &sysConfig); err != nil {
		return false, "", fmt.Errorf("failed to parse system configuration: %v", err)
	}

	if taskP.SecurityGroupID == "" {
		return false, "", fmt.Errorf("security group ID is required")
	}

	if len(taskP.ExpectedRules) == 0 {
		return false, "", fmt.Errorf("at least one expected rule is required")
	}

	if sysConfig.AccessKey == "" || sysConfig.SecretKey == "" || sysConfig.Region == "" {
		return false, "", fmt.Errorf("AWS credentials and region are required in system configuration")
	}

	return true, "", nil
}

// Execute performs the security group check
func (e *AWSSecurityGroupCheckExecutor) Execute(ctx CheckContext) (ExecutionResult, error) {
	// Parse system configuration
	var sysConfig awsSecurityGroupSystemConfig
	if err := json.Unmarshal([]byte(ctx.ConnectedSystem.Configuration), &sysConfig); err != nil {
		return ExecutionResult{Status: StatusError, Output: fmt.Sprintf("Failed to parse system configuration: %v", err)}, fmt.Errorf("failed to parse system configuration: %v", err)
	}

	// Parse task parameters
	var taskP awsSecurityGroupTaskParams
	taskParamsBytes, err := json.Marshal(ctx.TaskInstance.Parameters)
	if err != nil {
		return ExecutionResult{Status: StatusError, Output: fmt.Sprintf("Failed to parse task parameters: %v", err)}, fmt.Errorf("failed to parse task parameters: %v", err)
	}
	if err := json.Unmarshal(taskParamsBytes, &taskP); err != nil {
		return ExecutionResult{Status: StatusError, Output: fmt.Sprintf("Failed to parse task parameters: %v", err)}, fmt.Errorf("failed to parse task parameters: %v", err)
	}

	// Create AWS configuration
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(sysConfig.Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			sysConfig.AccessKey,
			sysConfig.SecretKey,
			"",
		)),
	)
	if err != nil {
		return ExecutionResult{Status: StatusError, Output: fmt.Sprintf("Failed to create AWS configuration: %v", err)}, fmt.Errorf("failed to create AWS configuration: %v", err)
	}

	// Create EC2 client
	ec2Client := ec2.NewFromConfig(cfg)

	// Describe security group
	input := &ec2.DescribeSecurityGroupsInput{
		GroupIds: []string{taskP.SecurityGroupID},
	}

	result, err := ec2Client.DescribeSecurityGroups(context.Background(), input)
	if err != nil {
		return ExecutionResult{Status: StatusError, Output: fmt.Sprintf("Failed to describe security group: %v", err)}, fmt.Errorf("failed to describe security group: %v", err)
	}

	if len(result.SecurityGroups) == 0 {
		return ExecutionResult{Status: StatusFailed, Output: "Security group not found"}, fmt.Errorf("security group not found")
	}

	securityGroup := result.SecurityGroups[0]
	missingRules := []string{}

	// Helper function to safely get string value from pointer
	getStringValue := func(s *string) string {
		if s == nil {
			return ""
		}
		return *s
	}

	// Helper function to safely get int32 value from pointer
	getInt32Value := func(i *int32) int32 {
		if i == nil {
			return 0
		}
		return *i
	}

	// Helper function to compare rules
	compareRules := func(expected, actual types.IpPermission) bool {
		// Compare protocol
		if getStringValue(expected.IpProtocol) != getStringValue(actual.IpProtocol) {
			return false
		}

		// Compare ports
		if getInt32Value(expected.FromPort) != getInt32Value(actual.FromPort) ||
			getInt32Value(expected.ToPort) != getInt32Value(actual.ToPort) {
			return false
		}

		// Compare IP ranges
		if len(expected.IpRanges) != len(actual.IpRanges) {
			return false
		}
		for i, expectedRange := range expected.IpRanges {
			if getStringValue(expectedRange.CidrIp) != getStringValue(actual.IpRanges[i].CidrIp) {
				return false
			}
		}

		return true
	}

	// Check inbound rules
	for _, expectedRule := range taskP.ExpectedRules {
		found := false
		for _, actualRule := range securityGroup.IpPermissions {
			if compareRules(expectedRule, actualRule) {
				found = true
				break
			}
		}
		if !found {
			missingRules = append(missingRules, fmt.Sprintf("Inbound: %s %d-%d",
				getStringValue(expectedRule.IpProtocol),
				getInt32Value(expectedRule.FromPort),
				getInt32Value(expectedRule.ToPort)))
		}
	}

	// Check outbound rules
	for _, expectedRule := range taskP.ExpectedRules {
		found := false
		for _, actualRule := range securityGroup.IpPermissionsEgress {
			if compareRules(expectedRule, actualRule) {
				found = true
				break
			}
		}
		if !found {
			missingRules = append(missingRules, fmt.Sprintf("Outbound: %s %d-%d",
				getStringValue(expectedRule.IpProtocol),
				getInt32Value(expectedRule.FromPort),
				getInt32Value(expectedRule.ToPort)))
		}
	}

	// Determine result status
	resultStatus := StatusSuccess
	if len(missingRules) > 0 {
		resultStatus = StatusFailed
	}

	resultOutput := struct {
		SecurityGroupID string   `json:"security_group_id"`
		MissingRules    []string `json:"missing_rules"`
	}{
		SecurityGroupID: taskP.SecurityGroupID,
		MissingRules:    missingRules,
	}

	outputJSON, err := json.Marshal(resultOutput)
	if err != nil {
		return ExecutionResult{Status: StatusError, Output: fmt.Sprintf("Failed to marshal result: %v", err)}, fmt.Errorf("failed to marshal result: %v", err)
	}

	return ExecutionResult{
		Status: resultStatus,
		Output: string(outputJSON),
	}, nil
}
