package models

import (
	"fmt"
	"strings"
	"time"
)

const layoutISO = "2006-01-02"

type CustomDate struct {
	time.Time
}

func (cd *CustomDate) UnmarshalJSON(b []byte) error {
	s := strings.Trim(string(b), "\"")
	if s == "null" || s == "" {
		return nil
	}
	t, err := time.Parse(layoutISO, s)
	if err != nil {
		// Try parsing with full timestamp if date-only fails
		t, err = time.Parse(time.RFC3339, s)
		if err != nil {
			return fmt.Errorf("failed to parse date %s: %w", s, err)
		}
	}
	cd.Time = t
	return nil
}
