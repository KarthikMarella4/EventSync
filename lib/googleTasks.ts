
export const insertGoogleTask = async (task: {
    title: string;
    notes?: string;
    due?: string; // RFC 3339 timestamp
}, providerToken: string) => {
    try {
        const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${providerToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: task.title,
                notes: task.notes,
                due: task.due
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Failed to create Google Task');
        return data.id;
    } catch (error) {
        console.error('Error inserting Google Task:', error);
        throw error;
    }
};

export const deleteGoogleTask = async (taskId: string, providerToken: string) => {
    try {
        const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${providerToken}`,
            },
        });

        if (!response.ok) {
            if (response.status === 410 || response.status === 404) {
                return true;
            }
            const data = await response.json();
            throw new Error(data.error?.message || 'Failed to delete Google Task');
        }
        return true;
    } catch (error) {
        console.error('Error deleting Google Task:', error);
        throw error;
    }
};

export const updateGoogleTask = async (taskId: string, updates: any, providerToken: string) => {
    try {
        const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${providerToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Failed to update Google Task');
        return data;
    } catch (error) {
        console.error('Error updating Google Task:', error);
        throw error;
    }
};

export const listGoogleTasks = async (providerToken: string) => {
    try {
        const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&showHidden=true&maxResults=100', {
            headers: {
                'Authorization': `Bearer ${providerToken}`,
            },
        });
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error listing Google Tasks:', error);
        return [];
    }
};
