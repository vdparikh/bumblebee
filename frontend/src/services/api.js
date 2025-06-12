import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const getToken = () => localStorage.getItem('authToken');

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
    let url = `/campaigns`;
    if (status) {
        url += `?status=${encodeURIComponent(status)}`;
    }
    const response = await apiClient.get(url);
    return response;
};

export const getUserFeed = async (params) => {
    console.log(getToken)
    let url = `/user-feed`;
    
    const response = await apiClient.get(url, params);
    return response;
};

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

    export const createTask = async (taskData) => {
        const response = await apiClient.post('/tasks', taskData);
        return response;
};

    export const executeTask = async (taskId) => {
        const response = await apiClient.post(`/tasks/${taskId}/execute`);
        return response;
};

    export const getTaskResults = async (taskId) => {
        const response = await apiClient.get(`/tasks/${taskId}/results`);
        return response;
};

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

export const getUsers = async () => {
    const response = await apiClient.get('/users');
    return response;
};

export const updateUser = async (userId, userData) => {
    const response = await apiClient.put(`/users/${userId}`, userData);
    return response;
};

export const deleteUser = async (userId) => {
    const response = await apiClient.delete(`/users/${userId}`);
    return response;
};

export const getCommentsByMasterTaskId = async (masterTaskId) => {
    const response = await apiClient.get(`/tasks/${masterTaskId}/comments`);
    return response;
};

export const addCommentToMasterTask = async (masterTaskId, commentData) => {
    const response = await apiClient.post(`/tasks/${masterTaskId}/comments`, commentData);
    return response;
};

export const getCommentsByCampaignTaskInstanceId = async (instanceId) => {
    const response = await apiClient.get(`/campaign-task-instances/${instanceId}/comments`);
    return response;
};

export const addCommentToCampaignTaskInstance = async (instanceId, commentData) => {
    const response = await apiClient.post(`/campaign-task-instances/${instanceId}/comments`, commentData);
    return response;
};

export const getEvidenceByTaskId = async (taskId) => {
    const response = await apiClient.get(`/tasks/${taskId}/evidence`);
    return response;
};

export const uploadEvidenceToTask = async (taskId, formData) => {
    const response = await apiClient.post(`/tasks/${taskId}/evidence`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response;
};

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

export const copyEvidenceToCampaignTaskInstance = async (targetInstanceId, sourceEvidenceIds) => {
    const response = await apiClient.post(`/campaign-task-instances/${targetInstanceId}/copy-evidence`, { source_evidence_ids: sourceEvidenceIds });
    return response;
};
export const addGenericEvidenceToCampaignTaskInstance = async (instanceId, evidenceData) => {
    const response = await apiClient.post(`/campaign-task-instances/${instanceId}/evidence`, evidenceData);
    return response;
};
export const updateTask = async (taskId, taskData) => {
    const response = await apiClient.put(`/tasks/${taskId}`, taskData);
    return response;
};

export const getCampaignById = async (campaignId) => {
    const response = await apiClient.get(`/campaigns/${campaignId}`);
    return response;
};

export const createCampaign = async (campaignData) => {
    const response = await apiClient.post('/campaigns', campaignData);
    return response;
};

export const updateCampaign = async (campaignId, campaignData) => {
    const response = await apiClient.put(`/campaigns/${campaignId}`, campaignData);
    return response;
};

export const deleteCampaign = async (campaignId) => {
    const response = await apiClient.delete(`/campaigns/${campaignId}`);
    return response;
};

export const getCampaignSelectedRequirements = async (campaignId) => {
    const response = await apiClient.get(`/campaigns/${campaignId}/requirements`);
    return response;
};

export const getCampaignTaskInstances = async (campaignId) => {
    const response = await apiClient.get(`/campaigns/${campaignId}/task-instances`);
    return response;
};

export const getCampaignTaskInstanceById = async (instanceId) => {
    const response = await apiClient.get(`/campaign-task-instances/${instanceId}`);
    return response;
};


export const updateCampaignTaskInstance = async (campaignTaskInstanceId, taskInstanceData) => {
    const response = await apiClient.put(`/campaign-task-instances/${campaignTaskInstanceId}`, taskInstanceData);
    return response;
};

export const getUserCampaignTasks = async (userId, userField, campaignStatus) => {
    if (!userId || !userField) {
        return Promise.reject(new Error("User ID and user field (owner/assignee) are required."));
    }
    let url = `/user-campaign-tasks?userId=${userId}&userField=${userField}`;
    if (campaignStatus) {
        url += `&campaignStatus=${encodeURIComponent(campaignStatus)}`;
    }
    const response = await apiClient.get(url);
    return response;
};

   export const getCampaignTasksByStatus = async (campaignStatus, taskStatus) => {
       const params = new URLSearchParams();
       if (campaignStatus) {
           params.append('campaignStatus', campaignStatus);
       }
       if (taskStatus) {
           params.append('taskStatus', taskStatus);
       }
       const queryString = params.toString();
       const url = `/campaign-tasks-by-status${queryString ? `?${queryString}` : ''}`;
       const response = await apiClient.get(url);
       return response;
   };
   
   export const getTaskInstancesByMasterTaskId = async (masterTaskId) => {
       try {
           const response = await apiClient.get(`/master-tasks/${masterTaskId}/instances`);
           return response;
       } catch (error) {
           console.error(`Error fetching instances for master task ${masterTaskId}:`, error.response || error.message);
           throw error;
       }
   };
   
export const executeCampaignTaskInstance = async (instanceId) => {
    const response = await apiClient.post(`/campaign-task-instances/${instanceId}/execute`);
    return response;
};
export const getCampaignTaskInstanceResults = async (instanceId) => {
    const response = await apiClient.get(`/campaign-task-instances/${instanceId}/results`);
    return response;
};

export const changePassword = async (passwordData) => {
    return apiClient.post('/auth/change-password', passwordData);
};

export const getConnectedSystems = async () => {
    const response = await apiClient.get('/systems');
    return response;
};

export const getConnectedSystemById = async (systemId) => {
    const response = await apiClient.get(`/systems/${systemId}`);
    return response;
};

export const createConnectedSystem = async (systemData) => {
    const response = await apiClient.post('/systems', systemData);
    return response;
};

export const updateConnectedSystem = async (systemId, systemData) => {
    const response = await apiClient.put(`/systems/${systemId}`, systemData);
    return response;
};

export const deleteConnectedSystem = async (systemId) => {
    const response = await apiClient.delete(`/systems/${systemId}`);
    return response;
};

export const getDocuments = () => apiClient.get('/documents');
export const createDocument = (documentData) => apiClient.post('/documents', documentData);
export const getDocumentById = (id) => apiClient.get(`/documents/${id}`);
export const updateDocument = (id, documentData) => apiClient.put(`/documents/${id}`, documentData);
export const deleteDocument = (id) => apiClient.delete(`/documents/${id}`);

export const reviewEvidence = (evidenceId, reviewData) => apiClient.put(`/evidence/${evidenceId}/review`, reviewData);

// Team Management API calls
export const getTeams = () => apiClient.get('/teams');
export const getTeamById = (teamId) => apiClient.get(`/teams/${teamId}`);
export const createTeam = (teamData) => apiClient.post('/teams', teamData);
export const updateTeam = (teamId, teamData) => apiClient.put(`/teams/${teamId}`, teamData);
export const deleteTeam = (teamId) => apiClient.delete(`/teams/${teamId}`);
export const addMemberToTeam = (teamId, userId, roleInTeam) => apiClient.post(`/teams/${teamId}/members`, { user_id: userId, role_in_team: roleInTeam });
export const removeMemberFromTeam = (teamId, userId) => apiClient.delete(`/teams/${teamId}/members/${userId}`);
export const getTeamMembers = (teamId) => apiClient.get(`/teams/${teamId}/members`);

// Audit Logs
export const getAuditLogs = async (params = {}) => {
    try {
        const response = await apiClient.get('/audit-logs', { params });
        return response;
    } catch (error) {
        console.error('Error fetching audit logs:', error.response || error.message);
        throw error;
    }
};
