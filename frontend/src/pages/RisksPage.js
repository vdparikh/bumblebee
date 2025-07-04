import React, { useState, useEffect, useCallback, useContext } from 'react';
import RiskManagementView from '../components/views/RiskManagementView';
import { getRisks, createRisk, updateRisk, getUsers } from '../services/api';
import { RightPanelContext } from '../App';
import PageHeader from '../components/common/PageHeader';
import { Button, Spinner, Alert } from 'react-bootstrap';
import EntityFormPanel from '../components/common/EntityFormPanel';

function RisksPage() {
    const [risks, setRisks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { openRightPanel, closeRightPanel } = useContext(RightPanelContext);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [riskRes, usersRes] = await Promise.all([
                getRisks(),
                getUsers(),
            ]);
            setRisks(Array.isArray(riskRes.data) ? riskRes.data : []);
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        } catch (err) {
            setError('Failed to load risks. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenPanel = (mode, dataToEdit = null) => {
        openRightPanel('entityForm', {
            title: `${mode === 'add' ? 'Add' : 'Edit'} Risk`,
            content: (
                <EntityFormPanel
                    show={true}
                    mode={mode}
                    entityType="risk"
                    initialData={dataToEdit}
                    onSave={handleSaveEntity}
                    onClose={closeRightPanel}
                    allUsers={users}
                />
            )
        });
    };

    const handleSaveEntity = async (entityType, data, idToUpdate) => {
        try {
            if (idToUpdate) {
                await updateRisk(idToUpdate, data);
            } else {
                await createRisk(data);
            }
            fetchData();
            closeRightPanel();
        } catch (err) {
            throw err;
        }
    };

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /> Loading Risks...</div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <div className="">
            <PageHeader title="Risks" subtitle="Manage all risks" />
            <RiskManagementView
                risks={risks}
                allUsers={users}
                onAddRisk={() => handleOpenPanel('add')}
                onEditRisk={(risk) => handleOpenPanel('edit', risk)}
            />
        </div>
    );
}

export default RisksPage; 