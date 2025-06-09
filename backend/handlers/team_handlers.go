package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
	// "github.com/vdparikh/compliance-automation/backend/auth" // For permission checks
)

type TeamHandler struct {
	Store *store.DBStore
}

func NewTeamHandler(s *store.DBStore) *TeamHandler {
	return &TeamHandler{Store: s}
}

func (h *TeamHandler) CreateTeamHandler(c *gin.Context) {
	var team models.Team
	if err := c.ShouldBindJSON(&team); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body for team creation", err)
		return
	}

	// Add authorization checks here (e.g., only admin can create teams)

	teamID, err := h.Store.CreateTeam(&team)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to create team", err)
		return
	}
	team.ID = teamID
	c.JSON(http.StatusCreated, team)
}

func (h *TeamHandler) GetTeamsHandler(c *gin.Context) {
	teams, err := h.Store.GetTeams()
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to fetch teams", err)
		return
	}
	c.JSON(http.StatusOK, teams)
}

func (h *TeamHandler) GetTeamByIDHandler(c *gin.Context) {
	teamID := c.Param("id")
	team, err := h.Store.GetTeamByID(teamID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			sendError(c, http.StatusNotFound, "Team not found", nil)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to fetch team", err)
		return
	}
	// Optionally fetch and include members
	members, err := h.Store.GetTeamMembers(teamID)
	if err == nil { // Non-critical if members fetch fails for this basic get
		team.Members = members
	}
	c.JSON(http.StatusOK, team)
}

func (h *TeamHandler) UpdateTeamHandler(c *gin.Context) {
	teamID := c.Param("id")
	var teamUpdates models.Team
	if err := c.ShouldBindJSON(&teamUpdates); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body for team update", err)
		return
	}

	// Add authorization checks

	teamUpdates.ID = teamID // Ensure ID is set for update
	err := h.Store.UpdateTeam(&teamUpdates)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			sendError(c, http.StatusNotFound, "Team not found for update", nil)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to update team", err)
		return
	}
	updatedTeam, _ := h.Store.GetTeamByID(teamID) // Fetch updated record
	c.JSON(http.StatusOK, updatedTeam)
}

func (h *TeamHandler) DeleteTeamHandler(c *gin.Context) {
	teamID := c.Param("id")

	// Add authorization checks

	err := h.Store.DeleteTeam(teamID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			sendError(c, http.StatusNotFound, "Team not found for deletion", nil)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to delete team", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Team deleted successfully"})
}

func (h *TeamHandler) AddUserToTeamHandler(c *gin.Context) {
	teamID := c.Param("id")
	var payload struct {
		UserID     string `json:"user_id" binding:"required"`
		RoleInTeam string `json:"role_in_team"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request: user_id is required", err)
		return
	}

	// Add authorization checks

	err := h.Store.AddUserToTeam(teamID, payload.UserID, payload.RoleInTeam)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to add user to team", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User added to team successfully"})
}

func (h *TeamHandler) RemoveUserFromTeamHandler(c *gin.Context) {
	teamID := c.Param("id")
	userID := c.Param("userId") // Assuming userID is part of the path, e.g., /teams/:id/members/:userId

	// Add authorization checks

	err := h.Store.RemoveUserFromTeam(teamID, userID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to remove user from team", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User removed from team successfully"})
}

func (h *TeamHandler) GetTeamMembersHandler(c *gin.Context) {
	teamID := c.Param("id")
	members, err := h.Store.GetTeamMembers(teamID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to fetch team members", err)
		return
	}
	c.JSON(http.StatusOK, members)
}
