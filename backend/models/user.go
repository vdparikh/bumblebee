package models

import (
	"time" // For created_at, updated_at if you add them
)

type User struct {
	ID             string    `json:"id" db:"id"`
	Name           string    `json:"name" db:"name"`
	Email          string    `json:"email" db:"email"`
	Role           string    `json:"role" db:"role"`
	HashedPassword string    `json:"-" db:"hashed_password"` // Exclude from JSON responses
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"` // Add password strength if desired
	// Role will be defaulted to 'user' on the backend for self-registration
}
