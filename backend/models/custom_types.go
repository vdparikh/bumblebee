package models

import (
	"database/sql/driver"
	"encoding/json"
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
		t, err = time.Parse(time.RFC3339, s)
		if err != nil {
			return fmt.Errorf("failed to parse date %s: %w", s, err)
		}
	}
	cd.Time = t
	return nil
}

// JSONB type for handling JSON data in the database
type JSONB json.RawMessage

// Scan implements the sql.Scanner interface for JSONB type
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("Scan source is not []byte, but %T", value)
	}

	// If bytes is empty or represents SQL NULL, set j to nil or an empty RawMessage.
	// json.RawMessage is a []byte, so assigning directly is correct.
	// Make a copy if the driver might reuse the buffer.
	if len(bytes) == 0 {
		*j = nil // Represent empty db value as nil JSONB
		return nil
	}
	*j = JSONB(make(json.RawMessage, len(bytes)))
	copy(*j, bytes)

	return nil
}

// Value implements the driver.Valuer interface for JSONB type
func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 { // Treat empty JSONB as SQL NULL
		return nil, nil
	}
	// return []byte(j), nil
	return json.Marshal(json.RawMessage(j))
}

// func (j *JSONB) Scan(value interface{}) error {
// 	bytes, ok := value.([]byte)
// 	if !ok {
// 		return errors.New("type assertion to []byte failed")
// 	}
// 	return json.Unmarshal(bytes, j)
// }

// func (j JSONB) Value() (driver.Value, error) {
// 	if len(j) == 0 {
// 		return nil, nil
// 	}
// 	return json.RawMessage(j).MarshalJSON()
// }
