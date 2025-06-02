package executor

import (
	"encoding/json"
	"fmt"
	"net"
	"strconv"
	"strings"
	"time"
)

type PortScanCheckExecutor struct{}

type portScanSystemConfig struct {
	Host string `json:"host"`
}

type portScanTaskParams struct {
	Port           int    `json:"port"`
	Protocol       string `json:"protocol"`
	TimeoutSeconds *int   `json:"timeout_seconds"`
}

func (e *PortScanCheckExecutor) ValidateParameters(taskParamsMap map[string]interface{}, systemConfigJSON json.RawMessage) (isValid bool, expectedParamsDesc string, err error) {
	expectedDesc := "For port_scan_check: ConnectedSystem.Configuration expects {'host': 'string'}. TaskInstance.Parameters expects {'port': 'number (required)', 'protocol': 'string (optional, tcp/udp, defaults to tcp)', 'timeout_seconds': 'number (optional, defaults to 5)'}."

	if systemConfigJSON == nil {
		return false, expectedDesc, fmt.Errorf("connected system configuration is required")
	}
	var sysConf portScanSystemConfig
	if err := json.Unmarshal(systemConfigJSON, &sysConf); err != nil {
		return false, expectedDesc, fmt.Errorf("failed to parse connected system configuration: %w. %s", err, expectedDesc)
	}
	if sysConf.Host == "" {
		return false, expectedDesc, fmt.Errorf("host is missing in connected system configuration. %s", expectedDesc)
	}

	if taskParamsMap == nil {
		return false, expectedDesc, fmt.Errorf("task parameters are required (at least port). %s", expectedDesc)
	}
	taskParamsBytes, err := json.Marshal(taskParamsMap)
	if err != nil {
		return false, expectedDesc, fmt.Errorf("failed to marshal task parameters for validation: %w", err)
	}
	var taskP portScanTaskParams
	if err := json.Unmarshal(taskParamsBytes, &taskP); err != nil {
		return false, expectedDesc, fmt.Errorf("failed to parse task parameters: %w. %s", err, expectedDesc)
	}
	if taskP.Port <= 0 || taskP.Port > 65535 {
		return false, expectedDesc, fmt.Errorf("task parameter 'port' is missing or invalid (must be 1-65535). %s", expectedDesc)
	}
	if taskP.Protocol != "" && taskP.Protocol != "tcp" && taskP.Protocol != "udp" {
		return false, expectedDesc, fmt.Errorf("task parameter 'protocol' must be 'tcp' or 'udp' if provided. %s", expectedDesc)
	}

	return true, expectedDesc, nil
}

func (e *PortScanCheckExecutor) Execute(checkCtx CheckContext) (ExecutionResult, error) {
	var output strings.Builder
	resultStatus := "Failed"

	taskInstance := checkCtx.TaskInstance
	connectedSystem := checkCtx.ConnectedSystem

	if connectedSystem == nil {
		output.WriteString("Error: Connected System is required for port_scan_check but was not found or provided.\n")
		return ExecutionResult{Status: "Error", Output: output.String()}, fmt.Errorf("connected system is nil for target ID %s", *taskInstance.Target)
	}

	var sysConfig portScanSystemConfig
	if err := json.Unmarshal(connectedSystem.Configuration, &sysConfig); err != nil {
		output.WriteString(fmt.Sprintf("Error parsing configuration for Connected System %s (%s): %v\n", connectedSystem.Name, connectedSystem.ID, err))
		return ExecutionResult{Status: "Error", Output: output.String()}, err
	}

	taskParamsBytes, _ := json.Marshal(taskInstance.Parameters)
	var taskP portScanTaskParams
	_ = json.Unmarshal(taskParamsBytes, &taskP)

	protocol := "tcp"
	if taskP.Protocol != "" {
		protocol = strings.ToLower(taskP.Protocol)
	}
	timeout := 5 * time.Second
	if taskP.TimeoutSeconds != nil && *taskP.TimeoutSeconds > 0 {
		timeout = time.Duration(*taskP.TimeoutSeconds) * time.Second
	}

	address := net.JoinHostPort(sysConfig.Host, strconv.Itoa(taskP.Port))
	output.WriteString(fmt.Sprintf("Attempting to connect to %s on port %d using %s (timeout: %s) via Connected System: %s\n", sysConfig.Host, taskP.Port, protocol, timeout, connectedSystem.Name))

	conn, err := net.DialTimeout(protocol, address, timeout)
	if err != nil {
		output.WriteString(fmt.Sprintf("Check FAILED: Port %d/%s on %s appears closed or unreachable. Error: %v\n", taskP.Port, protocol, sysConfig.Host, err))
	} else {
		conn.Close()
		resultStatus = "Success"
		output.WriteString(fmt.Sprintf("Check PASSED: Successfully connected to port %d/%s on %s.\n", taskP.Port, protocol, sysConfig.Host))
	}

	return ExecutionResult{Status: resultStatus, Output: output.String()}, nil
}

var _ CheckExecutor = (*PortScanCheckExecutor)(nil)
