
export const createCalendarEvent = async (event: {
    title: string;
    description: string;
    location: string;
    startTime: string; // ISO string
    endTime: string; // ISO string
}, providerToken: string) => {
    console.log('Creating calendar event with token:', providerToken ? 'Token exists' : 'Token missing');

    const eventData = {
        summary: event.title,
        location: event.location,
        description: event.description,
        start: {
            dateTime: event.startTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
            dateTime: event.endTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
    };

    try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${providerToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Calendar API Error:', data);
            throw new Error(data.error?.message || 'Failed to create calendar event');
        }

        return data.id; // Return the Google Event ID
    } catch (error) {
        console.error('Error in createCalendarEvent:', error);
        throw error;
    }
};

export const deleteCalendarEvent = async (eventId: string, providerToken: string) => {
    console.log('Deleting calendar event:', eventId);
    try {
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${providerToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('Calendar Delete Error:', data);
            throw new Error(data.error?.message || 'Failed to delete calendar event');
        }

        return true;
    } catch (error) {
        console.error('Error in deleteCalendarEvent:', error);
        // Don't throw, just log. We still want to delete from our app even if Google fails.
        return false;
    }
};
