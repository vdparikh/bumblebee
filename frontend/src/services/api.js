import axios from 'axios';

const API_URL = 'http://localhost:8080/api'; // Your Go backend URL

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Get tasks, optionally filtered by userID and userField ("owner" or "assignee")
export const getTasks = (userId, userField) => {
    let url = '/tasks';
    if (userId && userField) {
        url += `?userId=${userId}&userField=${userField}`;
    }
    return apiClient.get(url);
};
export const getTaskById = (taskId) => {
    return apiClient.get(`/tasks/${taskId}`);
};

    // Renamed from createCheckDefinition, payload is now a Task
    export const createTask = (taskData) => {
        return apiClient.post('/tasks', taskData);
};

    // Will operate on a Task ID
    export const executeTask = (taskId) => {
        return apiClient.post(`/tasks/${taskId}/execute`);
};

    // Will get results for a Task ID
    export const getTaskResults = (taskId) => {
        return apiClient.get(`/tasks/${taskId}/results`);
};

// --- Requirement API calls ---
export const getRequirements = () => {
    return apiClient.get('/requirements');
};

export const getRequirementById = (id) => {
    return apiClient.get(`/requirements/${id}`);
};

export const createRequirement = (requirementData) => {
    return apiClient.post('/requirements', requirementData);
};

export const updateRequirement = (requirementId, requirementData) => {
    return apiClient.put(`/requirements/${requirementId}`, requirementData);
};

// --- ComplianceStandard API calls ---
export const getComplianceStandards = () => {
    return apiClient.get('/standards');
};

export const createComplianceStandard = (standardData) => {
    return apiClient.post('/standards', standardData);
};

export const updateStandard = (standardId, standardData) => {
    return apiClient.put(`/standards/${standardId}`, standardData);
};

// --- User API calls ---
export const getUsers = () => {
    return apiClient.get('/users');
};


// In frontend/src/services/api.js

// ... your existing apiClient and other functions ...

// --- Task Comments ---
// For Master Tasks
export const getCommentsByMasterTaskId = (masterTaskId) => {
    return apiClient.get(`/tasks/${masterTaskId}/comments`);
};

export const addCommentToMasterTask = (masterTaskId, commentData) => {
    // commentData should be like { text: "...", userId: "..." }
    return apiClient.post(`/tasks/${masterTaskId}/comments`, commentData);
};

// For Campaign Task Instances
export const getCommentsByCampaignTaskInstanceId = (instanceId) => {
    return apiClient.get(`/campaign-task-instances/${instanceId}/comments`);
};

export const addCommentToCampaignTaskInstance = (instanceId, commentData) => {
    return apiClient.post(`/campaign-task-instances/${instanceId}/comments`, commentData);
};



// --- Task Evidence ---
export const getEvidenceByTaskId = (taskId) => {
    return apiClient.get(`/tasks/${taskId}/evidence`);
};

export const uploadEvidenceToTask = (taskId, formData) => {
    // formData is a FormData object, typically containing a file
    return apiClient.post(`/tasks/${taskId}/evidence`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// For Campaign Task Instances
export const getEvidenceByCampaignTaskInstanceId = (instanceId) => {
    return apiClient.get(`/campaign-task-instances/${instanceId}/evidence`);
};
export const uploadEvidenceToCampaignTaskInstance = (instanceId, formData) => {
    return apiClient.post(`/campaign-task-instances/${instanceId}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// For Campaign Task Instances - Text/Link Evidence
export const addGenericEvidenceToCampaignTaskInstance = (instanceId, evidenceData) => {
    // evidenceData is a JSON object, e.g., { type: 'link', file_path: 'url', description: '...' } or { type: 'text', description: '...' }
    return apiClient.post(`/campaign-task-instances/${instanceId}/evidence`, evidenceData);
};
// --- Update Task (can be used for status or other fields) ---
export const updateTask = (taskId, taskData) => {
    return apiClient.put(`/tasks/${taskId}`, taskData);
};

// You might also want a more specific one if only status is updated from TaskDetail:
// export const updateTaskStatus = (taskId, statusData) => {
//     // statusData could be { status: "New Status" }
//     return apiClient.patch(`/tasks/${taskId}/status`, statusData); // Or PUT to a specific status endpoint
// };

// --- Campaign API Calls ---
export const getCampaigns = (campaignStatus) => {
        let url = `/campaigns`;

    if (campaignStatus) {
        url += `?campaignStatus=${encodeURIComponent(campaignStatus)}`; // Ensure status is URL encoded
    }
    
    return apiClient.get(url);
};

export const getCampaignById = (campaignId) => {
    return apiClient.get(`/campaigns/${campaignId}`);
};

export const createCampaign = (campaignData) => {
    // campaignData includes name, description, standard_id, start_date, end_date, selected_requirements
    return apiClient.post('/campaigns', campaignData);
};

export const updateCampaign = (campaignId, campaignData) => {
    return apiClient.put(`/campaigns/${campaignId}`, campaignData);
};

export const deleteCampaign = (campaignId) => {
    return apiClient.delete(`/campaigns/${campaignId}`);
};

export const getCampaignSelectedRequirements = (campaignId) => {
    return apiClient.get(`/campaigns/${campaignId}/requirements`);
};

export const getCampaignTaskInstances = (campaignId) => {
    return apiClient.get(`/campaigns/${campaignId}/task-instances`);
};


// --- Campaign Task Instance API Calls ---
export const getCampaignTaskInstanceById = (instanceId) => {
    return apiClient.get(`/campaign-task-instances/${instanceId}`);
};

export const updateCampaignTaskInstance = (campaignTaskInstanceId, taskInstanceData) => {
    return apiClient.put(`/campaign-task-instances/${campaignTaskInstanceId}`, taskInstanceData);
};

// --- User Specific Campaign Tasks ---
export const getUserCampaignTasks = (userId, userField, campaignStatus) => {
    // userField should be "owner" or "assignee"
    if (!userId || !userField) {
        return Promise.reject(new Error("User ID and user field (owner/assignee) are required."));
    }
    // return apiClient.get(`/user-campaign-tasks?userId=${userId}&userField=${userField}`);
    let url = `/user-campaign-tasks?userId=${userId}&userField=${userField}`;
    if (campaignStatus) {
        url += `&campaignStatus=${encodeURIComponent(campaignStatus)}`; // Ensure status is URL encoded
    }
    return apiClient.get(url);
};

export const executeCampaignTaskInstance = (instanceId) => apiClient.post(`/campaign-task-instances/${instanceId}/execute`);
export const getCampaignTaskInstanceResults = (instanceId) => apiClient.get(`/campaign-task-instances/${instanceId}/results`);


// ... rest of your API functions ...

// Add more functions for other endpoints as needed
// export const getEvidenceForTask = (taskId) => apiClient.get(`/tasks/${taskId}/evidence`);
// export const addCommentToTask = (taskId, commentData) => apiClient.post(`/tasks/${taskId}/comments`, commentData);