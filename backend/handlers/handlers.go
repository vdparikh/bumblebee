package handlers

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/vdparikh/compliance-automation/backend/models"
)

// In-memory store for simplicity. Replace with a database.
var (
	checkDefinitions = make(map[string]models.CheckDefinition)
	checkResults     = make(map[string][]models.CheckResult) // Keyed by CheckDefinitionID
	mu               sync.RWMutex
)

// CreateCheckDefinitionHandler handles the creation of new check definitions.
func CreateCheckDefinitionHandler(c *gin.Context) {
	var newCheck models.CheckDefinition
	if err := c.ShouldBindJSON(&newCheck); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	mu.Lock()
	defer mu.Unlock()

	newCheck.ID = uuid.New().String()
	newCheck.CreatedAt = time.Now()
	checkDefinitions[newCheck.ID] = newCheck

	c.JSON(http.StatusCreated, newCheck)
}

// GetCheckDefinitionsHandler lists all check definitions.
func GetCheckDefinitionsHandler(c *gin.Context) {
	mu.RLock()
	defer mu.RUnlock()

	defs := make([]models.CheckDefinition, 0, len(checkDefinitions))
	for _, def := range checkDefinitions {
		defs = append(defs, def)
	}
	c.JSON(http.StatusOK, defs)
}

// // ExecuteCheckHandler simulates executing a check (actual logic would be more complex).
// func ExecuteCheckHandler(c *gin.Context) {
// 	checkID := c.Param("id")

// 	mu.Lock() // Lock for writing results
// 	defer mu.Unlock()

// 	if _, exists := checkDefinitions[checkID]; !exists {
// 		c.JSON(http.StatusNotFound, gin.H{"error": "Check definition not found"})
// 		return
// 	}

// 	// TODO: Implement actual check execution logic based on checkDefinitions[checkID].CheckType
// 	// For now, just create a dummy result.
// 	result := models.CheckResult{
// 		ID:                uuid.New().String(),
// 		CheckDefinitionID: checkID,
// 		Timestamp:         time.Now(),
// 		Status:            "PASS", // Placeholder
// 		Output:            "Check executed successfully (simulated).",
// 	}
// 	checkResults[checkID] = append(checkResults[checkID], result)

// 	c.JSON(http.StatusOK, gin.H{"message": "Check execution triggered", "result": result})
// }

// GetCheckResultsHandler retrieves results for a specific check.
func GetCheckResultsHandler(c *gin.Context) {
	checkID := c.Param("id")

	mu.RLock()
	defer mu.RUnlock()

	results, ok := checkResults[checkID]
	if !ok {
		// Return empty list if no results yet, or 404 if check def doesn't exist
		if _, defExists := checkDefinitions[checkID]; !defExists {
			c.JSON(http.StatusNotFound, gin.H{"error": "Check definition not found"})
			return
		}
		c.JSON(http.StatusOK, []models.CheckResult{})
		return
	}
	c.JSON(http.StatusOK, results)
}
