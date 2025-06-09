package store

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/vdparikh/compliance-automation/backend/models"
)

func (s *DBStore) CreateTeam(team *models.Team) (string, error) {
	if team.ID == "" {
		team.ID = uuid.NewString()
	}
	team.CreatedAt = time.Now()
	team.UpdatedAt = time.Now()

	query := `
		INSERT INTO teams (id, name, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	err := s.DB.QueryRowx(query, team.ID, team.Name, team.Description, team.CreatedAt, team.UpdatedAt).Scan(&team.ID)
	if err != nil {
		log.Printf("Error creating team in DB: %v. Team: %+v", err, team)
		return "", fmt.Errorf("failed to create team: %w", err)
	}
	return team.ID, nil
}

func (s *DBStore) GetTeamByID(teamID string) (*models.Team, error) {
	var team models.Team
	query := `SELECT id, name, description, created_at, updated_at FROM teams WHERE id = $1`
	err := s.DB.Get(&team, query, teamID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		log.Printf("Error getting team by ID from DB: %v", err)
		return nil, fmt.Errorf("failed to get team by ID %s: %w", teamID, err)
	}
	// Optionally, fetch members here or leave it to a separate GetTeamMembers call
	return &team, nil
}

func (s *DBStore) GetTeams() ([]models.Team, error) {
	var teams []models.Team
	query := `SELECT id, name, description, created_at, updated_at FROM teams ORDER BY name ASC`
	err := s.DB.Select(&teams, query)
	if err != nil {
		log.Printf("Error getting teams from DB: %v", err)
		return nil, fmt.Errorf("failed to get teams: %w", err)
	}
	if teams == nil {
		teams = []models.Team{}
	}
	return teams, nil
}

func (s *DBStore) UpdateTeam(team *models.Team) error {
	team.UpdatedAt = time.Now()
	query := `
		UPDATE teams SET
			name = $1,
			description = $2,
			updated_at = $3
		WHERE id = $4`

	result, err := s.DB.Exec(query, team.Name, team.Description, team.UpdatedAt, team.ID)
	if err != nil {
		log.Printf("Error updating team in DB: %v. TeamID: %s", err, team.ID)
		return fmt.Errorf("failed to update team %s: %w", team.ID, err)
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *DBStore) DeleteTeam(teamID string) error {
	query := `DELETE FROM teams WHERE id = $1`
	result, err := s.DB.Exec(query, teamID)
	if err != nil {
		return fmt.Errorf("failed to delete team %s: %w", teamID, err)
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *DBStore) AddUserToTeam(teamID string, userID string, roleInTeam string) error {
	if roleInTeam == "" {
		roleInTeam = "member" // Default role
	}
	query := `
		INSERT INTO team_members (team_id, user_id, role_in_team)
		VALUES ($1, $2, $3)
		ON CONFLICT (team_id, user_id) DO UPDATE SET role_in_team = EXCLUDED.role_in_team`
	_, err := s.DB.Exec(query, teamID, userID, roleInTeam)
	if err != nil {
		return fmt.Errorf("failed to add user %s to team %s: %w", userID, teamID, err)
	}
	return nil
}

func (s *DBStore) RemoveUserFromTeam(teamID string, userID string) error {
	query := `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`
	_, err := s.DB.Exec(query, teamID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove user %s from team %s: %w", userID, teamID, err)
	}
	return nil
}

func (s *DBStore) GetTeamMembers(teamID string) ([]models.User, error) {
	var members []models.User
	query := `
		SELECT u.id, u.name, u.email, u.role -- Add other user fields as needed
		FROM users u
		JOIN team_members tm ON u.id = tm.user_id
		WHERE tm.team_id = $1
		ORDER BY u.name ASC`
	err := s.DB.Select(&members, query, teamID)
	if err != nil {
		return nil, fmt.Errorf("failed to get members for team %s: %w", teamID, err)
	}
	if members == nil {
		members = []models.User{}
	}
	return members, nil
}
