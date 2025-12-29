
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

        return data;
    } catch (error) {
        console.error('Error in createCalendarEvent:', error);
        throw error;
    }
};
