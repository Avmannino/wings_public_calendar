// src/components/WingsCalendar.jsx

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import googleCalendarPlugin from "@fullcalendar/google-calendar";

function getClassForTitle(title = "") {
  const t = title.toLowerCase();
  if (t.includes("stick") && t.includes("puck")) return "evt-stickpuck";
  if (t.includes("public") && t.includes("skate")) return "evt-publicskate";
  if (t.includes("cosmic") && t.includes("skate")) return "evt-cosmic";
  if (t.includes("drop") && t.includes("in")) return "evt-dropin";
  if (t.includes("open") && t.includes("hockey")) return "evt-openhockey";
  return "evt-default";
}

export default function WingsCalendar() {
  const timeZone = import.meta.env.VITE_TZ || "America/New_York";
  const apiKey = (import.meta.env.VITE_GCAL_API_KEY || "").trim();
  const calendarId = (import.meta.env.VITE_GCAL_ID || "").trim();

  // Helps you immediately confirm env vars are actually loading (common cause of 403)
  // NOTE: After editing .env you MUST restart `npm run dev`
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("[WingsCalendar] GCAL key loaded?", !!apiKey);
    // eslint-disable-next-line no-console
    console.log("[WingsCalendar] GCAL id:", calendarId);
    // eslint-disable-next-line no-console
    console.log("[WingsCalendar] TZ:", timeZone);
  }

  // If the key/id isn't loaded, don't even render the Google source (prevents confusing 403s)
  if (!apiKey || !calendarId) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Calendar is not configured</div>
        <div style={{ opacity: 0.85, lineHeight: 1.4 }}>
          Missing <code>VITE_GCAL_API_KEY</code> or <code>VITE_GCAL_ID</code>.
          <br />
          Make sure your <code>.env</code> is in the project root (next to <code>package.json</code>)
          and restart the dev server.
        </div>
      </div>
    );
  }

  return (
    <FullCalendar
      plugins={[timeGridPlugin, listPlugin, interactionPlugin, googleCalendarPlugin]}
      initialView="timeGridWeek"
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "timeGridWeek,timeGridDay,listWeek",
      }}
      height="auto"
      expandRows
      nowIndicator
      timeZone={timeZone}
      googleCalendarApiKey={apiKey}
      events={{ googleCalendarId: calendarId }}
      eventClassNames={(arg) => [getClassForTitle(arg.event.title)]}
      eventClick={(info) => {
        // Prevent FullCalendar's default navigation
        info.jsEvent.preventDefault();

        // If Google provides a URL, open it
        if (info.event.url) {
          window.open(info.event.url, "_blank", "noopener,noreferrer");
        }
      }}
      // Surface what Google returns (this will show useful info in the console
      // like "Requests from referer are blocked" or "The calendar is not public")
      eventSourceFailure={(error) => {
        // eslint-disable-next-line no-console
        console.error("[WingsCalendar] Google event source failed:", error);
      }}
    />
  );
}
