document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const fetchButton = document.getElementById('fetchUpdatesButton');
    const chatIdInput = document.getElementById('chatId');
    const accessTokenInput = document.getElementById('accessToken');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const eventDetailsPopupEl = document.getElementById('eventDetailsPopup');

    let calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        events: [], // Start with no events
        eventClick: function(info) {
            // Show details in a custom popup
            let content = `<h5>${info.event.startStr}</h5>`;
            const submittedBy = info.event.extendedProps.submitted;
            const notSubmittedBy = info.event.extendedProps.notSubmitted;

            if (submittedBy && submittedBy.length > 0) {
                content += '<b>Submitted:</b><ul>';
                submittedBy.forEach(name => { content += `<li>${name}</li>`; });
                content += '</ul>';
            } else {
                content += '<b>No updates submitted.</b><br>';
            }

            if (notSubmittedBy && notSubmittedBy.length > 0) {
                content += '<b>Not Submitted:</b><ul>';
                notSubmittedBy.forEach(name => { content += `<li>${name}</li>`; });
                content += '</ul>';
            } else {
                 content += '<b>Everyone submitted or no one was expected.</b>';
            }

            eventDetailsPopupEl.innerHTML = content;
            eventDetailsPopupEl.style.display = 'block';
            eventDetailsPopupEl.style.left = info.jsEvent.pageX + 'px';
            eventDetailsPopupEl.style.top = info.jsEvent.pageY + 'px';

            // Simple way to hide popup when clicking elsewhere
            document.addEventListener('click', function hidePopup(e) {
                if (!eventDetailsPopupEl.contains(e.target) && e.target !== info.el) {
                    eventDetailsPopupEl.style.display = 'none';
                    document.removeEventListener('click', hidePopup);
                }
            }, true); // Use capture to ensure it runs before other clicks might prevent it
        }
    });
    calendar.render();

    fetchButton.addEventListener('click', async function() {
        const chatId = chatIdInput.value.trim();
        const accessToken = accessTokenInput.value.trim();
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!chatId || !accessToken || !startDate || !endDate) {
            alert('Please fill in Chat ID, Access Token, Start Date, and End Date.');
            return;
        }

        eventDetailsPopupEl.style.display = 'none'; // Hide any existing popup

        try {
            const response = await fetch('/api/analyze-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ chatId, accessToken, startDate, endDate }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data && result.data.standupAnalysis && result.data.standupAnalysis.calendarData) {
                const calendarData = result.data.standupAnalysis.calendarData;
                const allMembers = result.data.allChatMembers.map(m => m.name); // Use names from allChatMembers

                const newEvents = [];
                const processedDates = new Set();


                if (calendarData.dailySummaries) {
                    calendarData.dailySummaries.forEach(summary => {
                        processedDates.add(summary.date);
                        let eventTitle = '';
                        let eventColor = 'grey'; // Default color

                        if (summary.submitted && summary.submitted.length > 0) {
                            eventTitle = `${summary.submitted.length} Update(s)`;
                            eventColor = 'green';
                        } else if (summary.notSubmitted && summary.notSubmitted.length > 0) {
                            eventTitle = `0 Updates`; // Or "All Missing"
                            eventColor = 'red';
                        } else {
                            eventTitle = 'No Activity / No Data';
                            eventColor = 'lightgrey';
                        }

                        newEvents.push({
                            title: eventTitle,
                            start: summary.date,
                            allDay: true,
                            color: eventColor,
                            extendedProps: {
                                submitted: summary.submitted || [],
                                notSubmitted: summary.notSubmitted || []
                            }
                        });
                    });
                }

                // Add events for days in the range that had no submissions at all
                // This ensures all days in the selected range reflect status based on allChatMembers
                const sDate = new Date(`${startDate}T00:00:00Z`); // Ensure comparison is in UTC context if dates are simple YYYY-MM-DD
                const eDate = new Date(`${endDate}T00:00:00Z`);

                for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
                    const currentDateStr = d.toISOString().split('T')[0];
                    if (!processedDates.has(currentDateStr)) {
                        // This date was not in dailySummaries, meaning no one submitted.
                        // All members from allChatMembers are considered notSubmitted for this day.
                        newEvents.push({
                            title: '0 Updates',
                            start: currentDateStr,
                            allDay: true,
                            color: 'red', // Mark as red since no one submitted
                            extendedProps: {
                                submitted: [],
                                notSubmitted: calendarData.allConsideredMembers || allMembers // Use allConsideredMembers from AI if available, else from Graph
                            }
                        });
                    }
                }


                calendar.removeAllEvents();
                calendar.addEventSource(newEvents);
            } else {
                console.error('Failed to get calendar data or data is not in expected format:', result);
                alert('Could not parse calendar data from the response.');
            }
        } catch (error) {
            console.error('Error fetching or processing standup data:', error);
            alert(`Error: ${error.message}`);
        }
    });
});
