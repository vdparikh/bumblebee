import React, { useState, useMemo } from 'react';
import { 
    Card, Button, ListGroup, Badge, Row, Col, Form, 
    InputGroup, Dropdown, DropdownButton, Alert 
} from 'react-bootstrap';
import { 
    FaEdit, FaPlusCircle, FaCogs, FaExclamationCircle, 
    FaFileMedicalAlt, FaFileContract, FaServer, FaFilter,
    FaSearch, FaChartBar, FaChartPie, FaChartLine,
    FaTasks, FaShieldAlt, FaCheckCircle, FaClock
} from 'react-icons/fa';
import { getStatusColor, getTaskCategoryIcon } from '../../utils/displayUtils';

const TaskLibraryView = ({ 
    tasks, 
    connectedSystems, 
    onAddTask, 
    onEditTask,
    showPageHeader = true 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedPriority, setSelectedPriority] = useState('all');
    const [selectedCheckType, setSelectedCheckType] = useState('all');
    const [selectedTarget, setSelectedTarget] = useState('all');
    const [sortBy, setSortBy] = useState('title');
    const [sortOrder, setSortOrder] = useState('asc');

    // Get unique values for filters
    const categories = useMemo(() => {
        const cats = [...new Set(tasks.map(task => task.category).filter(Boolean))];
        return cats.sort();
    }, [tasks]);

    const priorities = useMemo(() => {
        const prios = [...new Set(tasks.map(task => task.defaultPriority).filter(Boolean))];
        return prios.sort();
    }, [tasks]);

    const checkTypes = useMemo(() => {
        const types = [...new Set(tasks.map(task => task.highLevelCheckType).filter(Boolean))];
        return types.sort();
    }, [tasks]);

    const targets = useMemo(() => {
        const targs = [...new Set(tasks.map(task => task.target).filter(Boolean))];
        return targs.sort();
    }, [tasks]);

    // Filter and sort tasks
    const filteredTasks = useMemo(() => {
        let filtered = tasks.filter(task => {
            const matchesSearch = !searchTerm || 
                task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
            const matchesPriority = selectedPriority === 'all' || task.defaultPriority === selectedPriority;
            const matchesCheckType = selectedCheckType === 'all' || task.highLevelCheckType === selectedCheckType;
            const matchesTarget = selectedTarget === 'all' || task.target === selectedTarget;

            return matchesSearch && matchesCategory && matchesPriority && matchesCheckType && matchesTarget;
        });

        // Sort tasks
        filtered.sort((a, b) => {
            let aVal = a[sortBy] || '';
            let bVal = b[sortBy] || '';
            
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [tasks, searchTerm, selectedCategory, selectedPriority, selectedCheckType, selectedTarget, sortBy, sortOrder]);

    // Calculate metrics for charts
    const metrics = useMemo(() => {
        const total = tasks.length;
        const automated = tasks.filter(t => t.checkType).length;
        const manual = total - automated;
        
        const priorityBreakdown = tasks.reduce((acc, task) => {
            const priority = task.defaultPriority || 'Unspecified';
            acc[priority] = (acc[priority] || 0) + 1;
            return acc;
        }, {});

        const categoryBreakdown = tasks.reduce((acc, task) => {
            const category = task.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});

        const checkTypeBreakdown = tasks.reduce((acc, task) => {
            const checkType = task.highLevelCheckType || 'Manual';
            acc[checkType] = (acc[checkType] || 0) + 1;
            return acc;
        }, {});

        return {
            total,
            automated,
            manual,
            priorityBreakdown,
            categoryBreakdown,
            checkTypeBreakdown
        };
    }, [tasks]);

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('all');
        setSelectedPriority('all');
        setSelectedCheckType('all');
        setSelectedTarget('all');
    };

    const renderMetricsCards = () => (
        <Row className="mb-4 metrics-row">
            <Col md={3}>
                <Card className="text-center metrics-card">
                    <Card.Body>
                        <FaTasks size={24} className="text-primary mb-2" />
                        <h4>{metrics.total}</h4>
                        <small className="text-muted">Total Tasks</small>
                    </Card.Body>
                </Card>
            </Col>
            <Col md={3}>
                <Card className="text-center metrics-card">
                    <Card.Body>
                        <FaCogs size={24} className="text-success mb-2" />
                        <h4>{metrics.automated}</h4>
                        <small className="text-muted">Automated</small>
                    </Card.Body>
                </Card>
            </Col>
            <Col md={3}>
                <Card className="text-center metrics-card">
                    <Card.Body>
                        <FaShieldAlt size={24} className="text-warning mb-2" />
                        <h4>{metrics.manual}</h4>
                        <small className="text-muted">Manual</small>
                    </Card.Body>
                </Card>
            </Col>
            <Col md={3}>
                <Card className="text-center metrics-card">
                    <Card.Body>
                        <FaCheckCircle size={24} className="text-info mb-2" />
                        <h4>{filteredTasks.length}</h4>
                        <small className="text-muted">Filtered</small>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );

    const renderFilters = () => (
        <Card className="mb-4 filter-panel">
            <Card.Header>
                <FaFilter className="me-2" />
                Filters & Search
            </Card.Header>
            <Card.Body>
                <Row className="filter-row">
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label>Search</Form.Label>
                            <InputGroup>
                                <InputGroup.Text>
                                    <FaSearch />
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search tasks..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                            </InputGroup>
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label>Category</Form.Label>
                            <Form.Select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="all">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label>Priority</Form.Label>
                            <Form.Select
                                value={selectedPriority}
                                onChange={(e) => setSelectedPriority(e.target.value)}
                            >
                                <option value="all">All Priorities</option>
                                {priorities.map(prio => (
                                    <option key={prio} value={prio}>{prio}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label>Check Type</Form.Label>
                            <Form.Select
                                value={selectedCheckType}
                                onChange={(e) => setSelectedCheckType(e.target.value)}
                            >
                                <option value="all">All Types</option>
                                {checkTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label>Target System</Form.Label>
                            <Form.Select
                                value={selectedTarget}
                                onChange={(e) => setSelectedTarget(e.target.value)}
                            >
                                <option value="all">All Systems</option>
                                {targets.map(target => (
                                    <option key={target} value={target}>
                                        {(() => {
                                            const system = connectedSystems.find(s => s.id === target);
                                            return system ? system.name : target;
                                        })()}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Row className="mt-3">
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>Sort By</Form.Label>
                            <div className="d-flex gap-2">
                                <Form.Select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{ width: 'auto' }}
                                >
                                    <option value="title">Title</option>
                                    <option value="category">Category</option>
                                    <option value="defaultPriority">Priority</option>
                                    <option value="highLevelCheckType">Check Type</option>
                                </Form.Select>
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="sort-button"
                                >
                                    {sortOrder === 'asc' ? '↑' : '↓'}
                                </Button>
                            </div>
                        </Form.Group>
                    </Col>
                    <Col md={6} className="text-end">
                        <Button variant="outline-secondary" onClick={clearFilters}>
                            Clear Filters
                        </Button>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );

    const renderCharts = () => (
        <Row className="mb-4 chart-row">
            <Col md={6}>
                <Card className="chart-card">
                    <Card.Header>
                        <FaChartPie className="me-2" />
                        Priority Distribution
                    </Card.Header>
                    <Card.Body>
                        {Object.entries(metrics.priorityBreakdown).map(([priority, count]) => (
                            <div key={priority} className="chart-item">
                                <span>{priority}</span>
                                <Badge bg={getStatusColor(priority)} className="task-badge">{count}</Badge>
                            </div>
                        ))}
                    </Card.Body>
                </Card>


                <Card className="chart-card mt-3">
                    <Card.Header>
                        <FaChartLine className="me-2" />
                        Check Type Distribution
                    </Card.Header>
                    <Card.Body>
                        {Object.entries(metrics.checkTypeBreakdown).map(([checkType, count]) => (
                            <div key={checkType} className="chart-item">
                                <span>{checkType}</span>
                                <Badge bg="info" className="task-badge">{count}</Badge>
                            </div>
                        ))}
                    </Card.Body>
                </Card>
            </Col>
            <Col md={6}>
                <Card className="chart-card">
                    <Card.Header>
                        <FaChartBar className="me-2" />
                        Category Distribution
                    </Card.Header>
                    <Card.Body>
                        {Object.entries(metrics.categoryBreakdown).map(([category, count]) => (
                            <div key={category} className="chart-item">
                                <span>{category}</span>
                                <Badge bg="secondary" className="task-badge">{count}</Badge>
                            </div>
                        ))}
                    </Card.Body>
                </Card>


            </Col>
        </Row>
    );

    const renderTaskList = () => (
        <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
                <h5>Tasks ({filteredTasks.length} of {tasks.length})</h5>
                <Button variant="primary" size="sm" onClick={onAddTask}>
                    <FaPlusCircle className="me-2" />Add Task
                </Button>
            </Card.Header>
            <ListGroup variant="flush">
                {filteredTasks.map(task => (
                    <ListGroup.Item key={task.id} className="task-item">
                        <div className="d-flex align-items-start">
                            <div className="task-icon me-3 mt-1">
                                {getTaskCategoryIcon(task)}
                            </div>
                            <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-start mb-0 mt-2">
                                    <h6 className="mb-1 fw-bold">{task.title}</h6>
                                </div>
                                
                                {task.description && (
                                    <p className="mb-2 small text-muted">
                                        {task.description.substring(0, 100)}
                                        {task.description.length > 100 ? "..." : ""}
                                    </p>
                                )}

                                <div className="d-flex flex-wrap gap-2 mb-2">
                                    {task.defaultPriority && (
                                        <Badge bg={getStatusColor(task.defaultPriority)}>
                                            <FaExclamationCircle className="me-1" size="0.7em" />
                                            {task.defaultPriority}
                                        </Badge>
                                    )}
                                    {task.checkType && (
                                        <Badge bg="info">
                                            <FaCogs className="me-1" size="0.7em" />
                                            {task.highLevelCheckType}
                                        </Badge>
                                    )}
                                    {task.category && (
                                        <Badge bg="secondary">
                                            {task.category}
                                        </Badge>
                                    )}
                                    {task.target && (
                                        <span className="small text-muted">
                                            <FaServer className="me-1" />
                                            Target: {(() => {
                                                const system = connectedSystems.find(s => s.id === task.target);
                                                return system ? `${system.name} (${system.systemType})` : task.target;
                                            })()}
                                        </span>
                                    )}
                                </div>

                                {task.evidenceTypesExpected && task.evidenceTypesExpected.length > 0 && (
                                    <div className="mb-2">
                                        <div className="d-flex flex-wrap gap-1">
                                            <small className="text-muted d-block mb-1">
                                                <FaFileMedicalAlt className="me-1" />
                                                Expected Evidence:
                                            </small>
                                            {task.evidenceTypesExpected.map(et => (
                                                <Badge key={et} bg="" text="dark" className="fw-normal badge-outline">
                                                    {et}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {task.requirements && task.requirements.length > 0 && (
                                    <div>
                                        <div className="small text-muted">
                                            <FaFileContract className="me-1" />
                                            Associated Requirements: 
                                        </div>
                                        <ul className="small">
                                            {task.requirements.map((req, index) => (
                                                <li key={index}>
                                                    {req.requirementText} ({req.controlIdReference})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <Button 
                                variant="outline-transparent" 
                                size="sm" 
                                onClick={() => onEditTask(task)}
                                title="Edit Task"
                            >
                                <FaEdit />
                            </Button>
                        </div>
                    </ListGroup.Item>
                ))}
                {filteredTasks.length === 0 && (
                    <ListGroup.Item className="text-muted text-center py-4">
                        {tasks.length === 0 ? 'No tasks found.' : 'No tasks match the current filters.'}
                    </ListGroup.Item>
                )}
            </ListGroup>
        </Card>
    );

    return (
        <div>
            {renderMetricsCards()}
            {renderCharts()}
            {renderFilters()}
            {renderTaskList()}
        </div>
    );
};

export default TaskLibraryView; 