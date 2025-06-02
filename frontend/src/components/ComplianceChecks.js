import React, { useState, useEffect, useCallback } from 'react';
import { getTasks, createTask, executeTask, getTaskResults } from '../services/api'; 

function ComplianceChecks() {
    const [tasks, setTasks] = useState([]); 
    
    
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newOwnerUserId, setNewOwnerUserId] = useState(''); 
    const [newAssigneeUserId, setNewAssigneeUserId] = useState('');
    const [newStatus, setNewStatus] = useState('Open'); 
    const [newDueDate, setNewDueDate] = useState('');
    const [newRequirementId, setNewRequirementId] = useState('');

    
    const [newCheckType, setNewCheckType] = useState(''); 
    const [newCheckTarget, setNewCheckTarget] = useState(''); 
    const [newCheckParams, setNewCheckParams] = useState(''); 
    
    const [results, setResults] = useState({}); 

    const fetchTasks = useCallback(async () => { 
        try {
            const response = await getTasks();
            setTasks(response.data);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleAddTask = async (e) => { 
        e.preventDefault();
        if (!newTitle.trim() || !newOwnerUserId.trim() || !newStatus.trim()) {
            alert("Title, Owner User ID, and Status are required.");
            return;
        }
        let params = {};
        try {
            if (newCheckParams.trim()) {
                params = JSON.parse(newCheckParams);
            }
        } catch (error) {
            alert("Invalid JSON for parameters. Please use a valid JSON string or leave empty.");
            return;
        }

        const taskData = {
            title: newTitle.trim(),
            description: newDescription.trim(),
            category: newCategory.trim(),
            ownerUserId: newOwnerUserId.trim(), 
            assigneeUserId: newAssigneeUserId.trim() || null, 
            status: newStatus.trim(),
            
            
            dueDate: newDueDate ? new Date(newDueDate).toISOString() : null, 
            requirementId: newRequirementId.trim() || null, 

            
            
            checkType: newCheckType.trim() || null,
            target: newCheckTarget.trim() || null,
            parameters: Object.keys(params).length > 0 ? params : null, 
        };
        
        try {
            await createTask(taskData);
            
            setNewTitle('');
            setNewDescription('');
            setNewCategory('');
            setNewOwnerUserId('');
            setNewAssigneeUserId('');
            setNewStatus('Open');
            setNewDueDate('');
            setNewRequirementId('');
            setNewCheckType('');
            setNewCheckTarget('');
            setNewCheckParams('');
            fetchTasks(); 
        } catch (error) {
            console.error("Error creating task:", error.response ? error.response.data : error.message);
            alert(`Failed to create task. ${error.response && error.response.data && error.response.data.error ? error.response.data.error : 'See console for details.'}`);
        }
    };

    const handleExecuteTask = async (taskId) => { 
        try {
            const response = await executeTask(taskId);
            alert(`Task execution triggered: ${response.data.message}`);
            fetchTaskResults(taskId);
        } catch (error) {
            console.error(`Error executing task ${taskId}:`, error);
            alert(`Failed to execute task ${taskId}. See console for details.`);
        }
    };

    const fetchTaskResults = async (taskId) => {
        try {
            const response = await getTaskResults(taskId);
            setResults(prevResults => ({ ...prevResults, [taskId]: response.data }));
        } catch (error) {
            console.error(`Error fetching results for task ${taskId}:`, error);
        }
    };

    return (
        <div>
            <h2>Compliance Tasks</h2>
            <form onSubmit={handleAddTask}>
                <h3>Create New Task</h3>
                <div><input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task Title*" required /></div>
                <div><textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description" /></div>
                <div><input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category" /></div>
                <div><input type="text" value={newOwnerUserId} onChange={(e) => setNewOwnerUserId(e.target.value)} placeholder="Owner User ID (e.g., a UUID)*" required /></div>
                <div><input type="text" value={newAssigneeUserId} onChange={(e) => setNewAssigneeUserId(e.target.value)} placeholder="Assignee User ID (e.g., a UUID)" /></div>
                <div>
                    <label htmlFor="status">Status*: </label>
                    <select id="status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} required>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Pending Review">Pending Review</option>
                        <option value="Closed">Closed</option>
                        <option value="Failed">Failed</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="dueDate">Due Date: </label>
                    <input id="dueDate" type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
                </div>
                <div><input type="text" value={newRequirementId} onChange={(e) => setNewRequirementId(e.target.value)} placeholder="Requirement ID (e.g., a UUID)" /></div>
                
                <h4>Optional: Automated Check Details</h4>
                <div><input type="text" value={newCheckType} onChange={(e) => setNewCheckType(e.target.value)} placeholder="Check Type (e.g., file_exists)" /></div>
                <div><input type="text" value={newCheckTarget} onChange={(e) => setNewCheckTarget(e.target.value)} placeholder="Target (e.g., 127.0.0.1)" /></div>
                <div><textarea value={newCheckParams} onChange={(e) => setNewCheckParams(e.target.value)} placeholder='Parameters (JSON, e.g., {"filePath":"/path/to/file"})' /></div>
                <button type="submit">Add Task</button>
            </form>

            <h3>Existing Tasks</h3>
            {tasks.length === 0 && <p>No tasks found.</p>}
            <ul>
                {tasks.map(task => (
                    <li key={task.id} style={{ borderBottom: '1px solid #eee', marginBottom: '10px', paddingBottom: '10px' }}>
                        <strong>{task.title}</strong> (ID: {task.id})
                        <br/>
                        Owner: {task.ownerUserId || 'N/A'}, Assignee: {task.assigneeUserId || 'N/A'}, Status: {task.status}
                        <br/>
                        Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                        <br/>
                        Description: {task.description || 'N/A'}
                        <br/>
                        Category: {task.category || 'N/A'}, Requirement ID: {task.requirementId || 'N/A'}
                        {task.checkType && (
                            <span>
                                <br/>
                                Automated Check: {task.checkType} on {task.target || 'N/A'}
                                <br/>
                                Parameters: {task.parameters ? JSON.stringify(task.parameters) : 'None'}
                            </span>
                        )}
                        <br/>
                        <button onClick={() => handleExecuteTask(task.id)} style={{ marginLeft: '10px', marginTop: '5px' }}>Execute</button>
                        <button onClick={() => fetchTaskResults(task.id)} style={{ marginLeft: '5px', marginTop: '5px' }}>View Results</button>
                        
                        {results[task.id] && (
                            <div style={{ marginLeft: '20px', marginTop: '5px', border: '1px solid #ddd', padding: '10px', backgroundColor: '#f9f9f9' }}>
                                <strong>Execution Results:</strong>
                                {results[task.id] && results[task.id].length > 0 ? results[task.id].map(res => (
                                    <div key={res.id} style={{borderBottom: '1px dotted #ccc', paddingBottom: '5px', marginBottom: '5px'}}>
                                        Timestamp: {new Date(res.timestamp).toLocaleString()}<br/>
                                        Status: {res.status}<br/>
                                        Output: <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{res.output}</pre>
                                    </div>
                                )) : <div>No results yet for this task.</div>}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ComplianceChecks;
