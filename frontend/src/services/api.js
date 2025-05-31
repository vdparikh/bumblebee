import axios from 'axios';

const API_URL = 'http://localhost:8080/api'; // Your Go backend URL

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const getToken = () => localStorage.getItem('authToken');

// Add a request interceptor to include the token in all requests
apiClient.interceptors.request.use(config => {
    const token = getToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

export const getCampaigns = async (status) => {
    // The interceptor will add the Authorization header
    let url = `/campaigns`;
    if (status) {
        url += `?status=${encodeURIComponent(status)}`;
    }
    // Using apiClient which now has the interceptor
    const response = await apiClient.get(url);
    return response; // Axios responses have data in response
};

export const getUserFeed = async (params) => {
    console.log(getToken)
    // The interceptor will add the Authorization header
    let url = `/user-feed`;
    
    // Using apiClient which now has the interceptor
    const response = await apiClient.get(url, params);
    return response; // Axios responses have data in response
};


// export const getUserFeed = (params) => apiClient.get('/user-feed', { params }); // params for limit, offset



// Get tasks, optionally filtered by userID and userField ("owner" or "assignee")
export const getTasks = async (userId, userField) => {
    let url = '/tasks';
    if (userId && userField) {
        url += `?userId=${userId}&userField=${userField}`;
    }
    const response = await apiClient.get(url);
    return response;
};

export const getTasksByRequirementId = async (requirementId) => {
    const response = await apiClient.get(`/requirements/${requirementId}/tasks`);
    return response;
};

export const getTaskById = async (taskId) => {
    const response = await apiClient.get(`/tasks/${taskId}`);
    return response;
};

    // Renamed from createCheckDefinition, payload is now a Task
    export const createTask = async (taskData) => {
        const response = await apiClient.post('/tasks', taskData);
        return response;
};

    // Will operate on a Task ID
    export const executeTask = async (taskId) => {
        const response = await apiClient.post(`/tasks/${taskId}/execute`);
        return response;
};

    // Will get results for a Task ID
    export const getTaskResults = async (taskId) => {
        const response = await apiClient.get(`/tasks/${taskId}/results`);
        return response;
};

// --- Requirement API calls ---
export const getRequirements = async () => {
    const response = await apiClient.get('/requirements');
    return response;
};

export const getRequirementById = async (id) => {
    const response = await apiClient.get(`/requirements/${id}`);
    return response;
};

export const createRequirement = async (requirementData) => {
    const response = await apiClient.post('/requirements', requirementData);
    return response;
};

export const updateRequirement = async (requirementId, requirementData) => {
    const response = await apiClient.put(`/requirements/${requirementId}`, requirementData);
    return response;
};

// --- ComplianceStandard API calls ---
export const getComplianceStandards = async () => {
    const response = await apiClient.get('/standards');
    return response;
};

export const createComplianceStandard = async (standardData) => {
    const response = await apiClient.post('/standards', standardData);
    return response;
};

export const updateStandard = async (standardId, standardData) => {
    const response = await apiClient.put(`/standards/${standardId}`, standardData);
    return response;
};

// --- User API calls ---
export const getUsers = async () => {
    const response = await apiClient.get('/users');
    return response;
};


// In frontend/src/services/api.js

// ... your existing apiClient and other functions ...

// --- Task Comments ---
// For Master Tasks
export const getCommentsByMasterTaskId = async (masterTaskId) => {
    const response = await apiClient.get(`/tasks/${masterTaskId}/comments`);
    return response;
};

export const addCommentToMasterTask = async (masterTaskId, commentData) => {
    // commentData should be like { text: "...", userId: "..." }
    const response = await apiClient.post(`/tasks/${masterTaskId}/comments`, commentData);
    return response;
};

// For Campaign Task Instances
export const getCommentsByCampaignTaskInstanceId = async (instanceId) => {
    const response = await apiClient.get(`/campaign-task-instances/${instanceId}/comments`);
    return response;
};

export const addCommentToCampaignTaskInstance = async (instanceId, commentData) => {
    const response = await apiClient.post(`/campaign-task-instances/${instanceId}/comments`, commentData);
    return response;
};



// --- Task Evidence ---
export const getEvidenceByTaskId = async (taskId) => {
    const response = await apiClient.get(`/tasks/${taskId}/evidence`);
    return response;
};

export const uploadEvidenceToTask = async (taskId, formData) => {
    // formData is a FormData object, typically containing a file
    const response = await apiClient.post(`/tasks/${taskId}/evidence`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response;
};

// For Campaign Task Instances
export const getEvidenceByCampaignTaskInstanceId = async (instanceId) => {
    const response = await apiClient.get(`/campaign-task-instances/${instanceId}/evidence`);
    return response;
};
export const uploadEvidenceToCampaignTaskInstance = async (instanceId, formData) => {
    const response = await apiClient.post(`/campaign-task-instances/${instanceId}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
};

// For Campaign Task Instances - Text/Link Evidence
export const addGenericEvidenceToCampaignTaskInstance = async (instanceId, evidenceData) => {
    // evidenceData is a JSON object, e.g., { type: 'link', file_path: 'url', description: '...' } or { type: 'text', description: '...' }
    const response = await apiClient.post(`/campaign-task-instances/${instanceId}/evidence`, evidenceData);
    return response;
};
// --- Update Task (can be used for status or other fields) ---
export const updateTask = async (taskId, taskData) => {
    const response = await apiClient.put(`/tasks/${taskId}`, taskData);
    return response;
};

// You might also want a more specific one if only status is updated from TaskDetail:
// export const updateTaskStatus = (taskId, statusData) => {
//     // statusData could be { status: "New Status" }
//     return apiClient.patch(`/tasks/${taskId}/status`, statusData); // Or PUT to a specific status endpoint
// };

// --- Campaign API Calls ---

export const getCampaignById = async (campaignId) => {
    const response = await apiClient.get(`/campaigns/${campaignId}`);
    return response;
};

export const createCampaign = async (campaignData) => {
    // campaignData includes name, description, standard_id, start_date, end_date, selected_requirements
    const response = await apiClient.post('/campaigns', campaignData);
    return response;
};

export const updateCampaign = async (campaignId, campaignData) => {
    const response = await apiClient.put(`/campaigns/${campaignId}`, campaignData);
    return response;
};

export const deleteCampaign = async (campaignId) => {
    const response = await apiClient.delete(`/campaigns/${campaignId}`);
    return response; // Or handle based on expected response (e.g., status code)
};

export const getCampaignSelectedRequirements = async (campaignId) => {
    const response = await apiClient.get(`/campaigns/${campaignId}/requirements`);
    return response;
};

export const getCampaignTaskInstances = async (campaignId) => {
    const response = await apiClient.get(`/campaigns/${campaignId}/task-instances`);
    return response;
};


// --- Campaign Task Instance API Calls ---
export const getCampaignTaskInstanceById = async (instanceId) => {
    const response = await apiClient.get(`/campaign-task-instances/${instanceId}`);
    return response;
};

export const updateCampaignTaskInstance = async (campaignTaskInstanceId, taskInstanceData) => {
    const response = await apiClient.put(`/campaign-task-instances/${campaignTaskInstanceId}`, taskInstanceData);
    return response;
};

// --- User Specific Campaign Tasks ---
export const getUserCampaignTasks = async (userId, userField, campaignStatus) => {
    // userField should be "owner" or "assignee"
    if (!userId || !userField) {
        return Promise.reject(new Error("User ID and user field (owner/assignee) are required."));
    }
    let url = `/user-campaign-tasks?userId=${userId}&userField=${userField}`;
    if (campaignStatus) {
        url += `&campaignStatus=${encodeURIComponent(campaignStatus)}`; // Ensure status is URL encoded
    }
    const response = await apiClient.get(url);
    return response;
};

export const executeCampaignTaskInstance = async (instanceId) => {
    const response = await apiClient.post(`/campaign-task-instances/${instanceId}/execute`);
    return response;
};
export const getCampaignTaskInstanceResults = async (instanceId) => {
    const response = await apiClient.get(`/campaign-task-instances/${instanceId}/results`);
    return response;
};


// ... rest of your API functions ...

// --- Auth API calls (beyond login/register if handled by AuthContext) ---
export const changePassword = async (passwordData) => {
    // passwordData: { currentPassword, newPassword, confirmPassword }
    return apiClient.post('/auth/change-password', passwordData);
};



// Add more functions for other endpoints as needed
// export const getEvidenceForTask = (taskId) => apiClient.get(`/tasks/${taskId}/evidence`);
// export const addCommentToTask = (taskId, commentData) => apiClient.post(`/tasks/${taskId}/comments`, commentData);
