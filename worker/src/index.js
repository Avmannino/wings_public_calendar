const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getClassForTitle(title = "") {
  const t = title.toLowerCase();
  if (t.includes("stick") && t.includes("puck"))                return "evt-stickpuck";
  if (t.includes("public") && t.includes("skate"))             return "evt-publicskate";
  if (t.includes("cosmic") && t.includes("skate"))             return "evt-cosmic";
  if (t.includes("freestyle") || (t.includes("figure") && t.includes("skating")))
                                                                return "evt-freestyle";
  if (t.includes("lunchtime") && t.includes("adult") && t.includes("drop") && t.includes("in") && t.includes("hockey"))
                                                                return "evt-lunchtime-dropin";
  if (t.includes("open") && t.includes("hockey"))              return "evt-openhockey";
  if (t.includes("private") && t.includes("lesson"))           return "evt-privatelesson";
  return "evt-default";
}

const TYPE_LABELS = {
  "evt-publicskate":      "Public Skate",
  "evt-stickpuck":        "Stick & Puck",
  "evt-cosmic":           "Cosmic Skate",
  "evt-openhockey":       "Open Hockey",
  "evt-freestyle":        "Figure Skating",
  "evt-privatelesson":    "Private Lesson",
  "evt-lunchtime-dropin": "Lunchtime Adult Drop-In Hockey",
  "all":                  "Full Schedule",
};

function esc(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function dtFmt(str) {
  return new Date(str).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function fold(line) {
  const out = [];
  while (line.length > 74) {
    out.push(line.slice(0, 74));
    line = " " + line.slice(74);
  }
  out.push(line);
  return out.join("\r\n");
}

function buildICS(events, calName) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Wings Arena//${esc(calName)}//EN`,
    `X-WR-CALNAME:Wings Arena – ${esc(calName)}`,
    "X-WR-TIMEZONE:America/New_York",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    const start = ev.start?.dateTime || ev.start?.date;
    const end   = ev.end?.dateTime   || ev.end?.date;
    if (!start) continue;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id || Math.random().toString(36).slice(2)}@wingsarena.com`);
    if (ev.start?.dateTime) {
      lines.push(`DTSTART:${dtFmt(start)}`);
      lines.push(`DTEND:${dtFmt(end || start)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${start.replace(/-/g, "")}`);
      lines.push(`DTEND;VALUE=DATE:${(end || start).replace(/-/g, "")}`);
    }
    lines.push(fold(`SUMMARY:${esc(ev.summary || "Wings Arena Event")}`));
    if (ev.description) lines.push(fold(`DESCRIPTION:${esc(ev.description)}`));
    lines.push("LOCATION:Wings Arena");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url    = new URL(request.url);
    const type   = url.searchParams.get("type") || "all";
    const calId  = url.searchParams.get("calId") || "";
    const apiKey = env.GCAL_API_KEY;

    if (!apiKey) {
      return new Response("Missing GCAL_API_KEY secret", {
        status: 500,
        headers: CORS_HEADERS,
      });
    }

    if (!calId) {
      return new Response("Missing calId query parameter", {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    // Fetch up to 12 months of upcoming events, paginating if needed
    const now    = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 12);

    let allEvents = [];
    let pageToken;

    do {
      const gcalUrl = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`
      );
      gcalUrl.searchParams.set("key",          apiKey);
      gcalUrl.searchParams.set("timeMin",      now.toISOString());
      gcalUrl.searchParams.set("timeMax",      future.toISOString());
      gcalUrl.searchParams.set("singleEvents", "true");
      gcalUrl.searchParams.set("orderBy",      "startTime");
      gcalUrl.searchParams.set("maxResults",   "500");
      if (pageToken) gcalUrl.searchParams.set("pageToken", pageToken);

      const res  = await fetch(gcalUrl.toString());
      const json = await res.json();

      if (!res.ok) {
        return new Response(
          `Google Calendar API error: ${json.error?.message || res.status}`,
          { status: 502, headers: CORS_HEADERS }
        );
      }

      allEvents = allEvents.concat(json.items || []);
      pageToken = json.nextPageToken;
    } while (pageToken);

    const filtered =
      type === "all"
        ? allEvents
        : allEvents.filter((ev) => getClassForTitle(ev.summary || "") === type);

    const label = TYPE_LABELS[type] || "Sessions";
    const ics   = buildICS(filtered, label);

    return new Response(ics, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type":        "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="wings-arena-${type}.ics"`,
        "Cache-Control":       "public, max-age=3600",
      },
    });
  },
};
