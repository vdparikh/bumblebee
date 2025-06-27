package sslchecker

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net"
	"strconv"
	"time"

	"github.com/vdparikh/compliance-automation/backend/integrations"
	"github.com/vdparikh/compliance-automation/backend/integrations/common"
	"github.com/vdparikh/compliance-automation/backend/models"
)

type SSLChecker struct{}

func New() *SSLChecker {
	return &SSLChecker{}
}

func (p *SSLChecker) ID() string {
	return "ssl_checker_v1"
}

func (p *SSLChecker) Name() string {
	return "SSL Certificate Expiry Checker"
}

func (p *SSLChecker) GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration {
	return map[string]models.CheckTypeConfiguration{
		"ssl_cert_expiry": {
			Label:       "SSL Certificate Expiry",
			TargetType:  "host",
			TargetLabel: "Host/IP Address",
			Parameters: []models.ParameterDefinition{
				{
					Name:     "host",
					Label:    "Host or IP",
					Type:     "text",
					Required: true,
					HelpText: "The hostname or IP address to check.",
				},
				{
					Name:     "port",
					Label:    "Port",
					Type:     "number",
					Required: true,
					HelpText: "The port to connect to (usually 443).",
				},
			},
		},
	}
}

func (p *SSLChecker) ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error) {
	if checkTypeKey != "ssl_cert_expiry" {
		return common.ExecutionResult{Status: common.StatusError, Output: "Unsupported check type"}, fmt.Errorf("unsupported check type: %s", checkTypeKey)
	}
	host, _ := ctx.TaskInstance.Parameters["host"].(string)
	portRaw := ctx.TaskInstance.Parameters["port"]
	port := 443
	if portRaw != nil {
		switch v := portRaw.(type) {
		case float64:
			port = int(v)
		case string:
			if p, err := strconv.Atoi(v); err == nil {
				port = p
			}
		}
	}
	addr := fmt.Sprintf("%s:%d", host, port)
	dialer := &net.Dialer{Timeout: 5 * time.Second}
	conn, err := tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{InsecureSkipVerify: true})
	if err != nil {
		return common.ExecutionResult{Status: common.StatusFailed, Output: err.Error()}, err
	}
	defer conn.Close()
	certs := conn.ConnectionState().PeerCertificates
	if len(certs) == 0 {
		return common.ExecutionResult{Status: common.StatusFailed, Output: "No certificates found"}, fmt.Errorf("no certificates found")
	}
	cert := certs[0]
	daysLeft := int(time.Until(cert.NotAfter).Hours() / 24)
	result := map[string]interface{}{
		"host":      host,
		"port":      port,
		"issuer":    cert.Issuer.CommonName,
		"subject":   cert.Subject.CommonName,
		"not_after": cert.NotAfter.Format(time.RFC3339),
		"days_left": daysLeft,
	}
	status := common.StatusSuccess
	if daysLeft < 0 {
		status = common.StatusFailed
		result["error"] = "Certificate expired"
	} else if daysLeft < 30 {
		status = common.StatusFailed
		result["warning"] = "Certificate expiring soon"
	}
	jsonOut, _ := json.Marshal(result)
	return common.ExecutionResult{Status: status, Output: string(jsonOut)}, nil
}

var _ integrations.IntegrationPlugin = (*SSLChecker)(nil)
