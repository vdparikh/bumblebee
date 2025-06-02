package handlers

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/vdparikh/compliance-automation/backend/models"
)

var (
	checkDefinitions = make(map[string]models.CheckDefinition)
	checkResults     = make(map[string][]models.CheckResult) 
	mu               sync.RWMutex
)

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

func GetCheckDefinitionsHandler(c *gin.Context) {
	mu.RLock()
	defer mu.RUnlock()

	defs := make([]models.CheckDefinition, 0, len(checkDefinitions))
	for _, def := range checkDefinitions {
		defs = append(defs, def)
	}
	c.JSON(http.StatusOK, defs)
}

func GetCheckResultsHandler(c *gin.Context) {
	checkID := c.Param("id")

	mu.RLock()
	defer mu.RUnlock()

	results, ok := checkResults[checkID]
	if !ok {
		if _, defExists := checkDefinitions[checkID]; !defExists {
			c.JSON(http.StatusNotFound, gin.H{"error": "Check definition not found"})
			return
		}
		c.JSON(http.StatusOK, []models.CheckResult{})
		return
	}
	c.JSON(http.StatusOK, results)
}
