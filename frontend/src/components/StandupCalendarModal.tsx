import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction'; // for eventClick and selectable
import './StandupCalendarModal.css'; // We'll create this file next

interface StandupCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CalendarEvent {
  title: string;
  start: string;
  allDay: boolean;
  color?: string;
  extendedProps?: {
    submitted: string[];
    notSubmitted: string[];
  };
}

interface DailySummary {
  date: string;
  submitted: string[];
  notSubmitted: string[];
}

interface CalendarData {
  dailySummaries: DailySummary[];
  allConsideredMembers: string[];
}

const StandupCalendarModal: React.FC<StandupCalendarModalProps> = ({ isOpen, onClose }) => {
  const [chatId, setChatId] = useState<string>(''); // Initialize with a sensible default or load from storage if needed
  const [accessToken, setAccessToken] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [eventDetailPopup, setEventDetailPopup] = useState<{ visible: boolean; content: JSX.Element | null; x: number; y: number }>({
    visible: false,
    content: null,
    x: 0,
    y: 0,
  });

  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    // Set default dates: last month to today
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 30);

    setStartDate(pastDate.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const handleFetchUpdates = async () => {
    if (!chatId || !accessToken || !startDate || !endDate) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setEvents([]); // Clear previous events

    try {
      // NOTE: This assumes your standupserver is running and accessible at this path.
      // If your React app is served from a different port than your server.js,
      // you'll need to configure CORS on server.js or use a proxy.
      // For development, a proxy in package.json or vite.config.js is common.
      // Example: "proxy": "http://localhost:3000" in package.json if server.js is on port 3000
      const response = await fetch('/api/analyze-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, accessToken, startDate, endDate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data?.standupAnalysis?.calendarData) {
        const calendarData: CalendarData = result.data.standupAnalysis.calendarData;
        const allMembers: string[] = result.data.allChatMembers?.map((m: any) => m.name) || calendarData.allConsideredMembers || [];

        const newEvents: CalendarEvent[] = [];
        const processedDates = new Set<string>();

        calendarData.dailySummaries?.forEach(summary => {
          processedDates.add(summary.date);
          let eventTitle = '';
          let eventColor = 'grey';

          if (summary.submitted && summary.submitted.length > 0) {
            eventTitle = `${summary.submitted.length} Update(s)`;
            eventColor = 'green';
          } else if (summary.notSubmitted && summary.notSubmitted.length > 0) {
            eventTitle = `0 Updates`;
            eventColor = 'red';
          } else {
            eventTitle = 'No Activity / No Data';
          }

          newEvents.push({
            title: eventTitle,
            start: summary.date,
            allDay: true,
            color: eventColor,
            extendedProps: {
              submitted: summary.submitted || [],
              notSubmitted: summary.notSubmitted || [],
            },
          });
        });

        // Fill in missing days within the range
        const sDate = new Date(startDate + 'T00:00:00Z'); // Ensure UTC context for date iteration
        const eDate = new Date(endDate + 'T00:00:00Z');

        for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
          const currentDateStr = d.toISOString().split('T')[0];
          if (!processedDates.has(currentDateStr)) {
            newEvents.push({
              title: '0 Updates',
              start: currentDateStr,
              allDay: true,
              color: 'red',
              extendedProps: {
                submitted: [],
                notSubmitted: allMembers,
              },
            });
          }
        }
        setEvents(newEvents);

      } else {
        console.error('Failed to get calendar data or data is not in expected format:', result);
        setError('Could not parse calendar data from the response.');
        setEvents([]);
      }
    } catch (err: any) {
      console.error('Error fetching or processing standup data:', err);
      setError(err.message || 'An unexpected error occurred.');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventClick = (clickInfo: any) => {
    const { event, jsEvent } = clickInfo;
    const submitted = event.extendedProps?.submitted || [];
    const notSubmitted = event.extendedProps?.notSubmitted || [];

    const content = (
      <div>
        <h5>{event.startStr}</h5>
        {submitted.length > 0 ? (
          <>
            <b>Submitted:</b>
            <ul>{submitted.map((name: string, i: number) => <li key={`s-${i}`}>{name}</li>)}</ul>
          </>
        ) : <p>No updates submitted.</p>}

        {notSubmitted.length > 0 && (
          <>
            <b>Not Submitted:</b>
            <ul>{notSubmitted.map((name: string, i: number) => <li key={`ns-${i}`}>{name}</li>)}</ul>
          </>
        )}
      </div>
    );
    setEventDetailPopup({ visible: true, content, x: jsEvent.pageX, y: jsEvent.pageY });
  };

  const closePopup = () => {
    if (eventDetailPopup.visible) {
      setEventDetailPopup({ visible: false, content: null, x: 0, y: 0 });
    }
  };

  useEffect(() => {
    document.addEventListener('click', closePopup, true); // Use capture phase
    return () => {
      document.removeEventListener('click', closePopup, true);
    };
  }, [eventDetailPopup.visible]);


  if (!isOpen) return null;

  return (
    <div className="standup-modal-overlay" onClick={onClose}>
      <div className="standup-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Standup Calendar</h2>
        <div className="modal-controls">
          <div>
            <label htmlFor="chatId">Chat ID:</label>
            <input type="text" id="chatId" value={chatId} onChange={(e) => setChatId(e.target.value)} />
          </div>
          <div>
            <label htmlFor="accessToken">Graph API Token:</label>
            <input type="password" id="accessToken" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
          </div>
          <div>
            <label htmlFor="startDate">Start Date:</label>
            <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="endDate">End Date:</label>
            <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button onClick={handleFetchUpdates} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Fetch Updates'}
          </button>
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="calendar-container">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth' // ,timeGridWeek,listWeek' - simplified for now
            }}
            events={events}
            eventClick={handleEventClick}
            height="auto" // Adjust as needed, or use aspectRation
          />
        </div>
         {eventDetailPopup.visible && (
          <div
            className="event-detail-popup"
            style={{ top: `${eventDetailPopup.y}px`, left: `${eventDetailPopup.x}px` }}
            onClick={(e) => e.stopPropagation()} // Prevent click inside popup from closing it immediately
          >
            {eventDetailPopup.content}
          </div>
        )}
        <button onClick={onClose} className="modal-close-button">Close</button>
      </div>
    </div>
  );
};

export default StandupCalendarModal;
