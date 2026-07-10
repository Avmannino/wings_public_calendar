import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import googleCalendarPlugin from "@fullcalendar/google-calendar";

const LUNCHTIME_RSVP_URL = "https://www.wingsarena.com/lunchtime-hockey";

// UTC midnight dates — must match FullCalendar's UTC-based viewRange values
const CLOSURE_START = new Date(Date.UTC(2026, 5, 29)); // June 29 UTC
const CLOSURE_END   = new Date(Date.UTC(2026, 6, 5));  // July 5 UTC (exclusive — through July 4)

function formatMonthDay(date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

const ICAL_WORKER_URL = "https://worker.amannino92.workers.dev";

const EVENT_TYPES = [
  { key: "evt-publicskate",   label: "Public Skate",    color: "#b82c2c" },
  { key: "evt-stickpuck",     label: "Stick & Puck",    color: "#2e4eb8" },
  { key: "evt-cosmic",        label: "Cosmic Skate",    color: "#7018cc" },
  { key: "evt-openhockey",    label: "Open Hockey",     color: "#ae7820" },
  { key: "evt-freestyle",     label: "Figure Skating",  color: "#2e9090" },
  { key: "evt-privatelesson", label: "Private Lesson",  color: "#1e7a3c" },
];

function getClassForTitle(title = "") {
  const t = title.toLowerCase();
  if (t.includes("stick") && t.includes("puck")) return "evt-stickpuck";
  if (t.includes("public") && t.includes("skate")) return "evt-publicskate";
  if (t.includes("cosmic") && t.includes("skate")) return "evt-cosmic";
  if (t.includes("freestyle") || (t.includes("figure") && t.includes("skating")))
    return "evt-freestyle";
  if (
    t.includes("lunchtime") &&
    t.includes("adult") &&
    t.includes("drop") &&
    t.includes("in") &&
    t.includes("hockey")
  )
    return "evt-lunchtime-dropin";
  if (t.includes("open") && t.includes("hockey")) return "evt-openhockey";
  if (t.includes("private") && t.includes("lesson")) return "evt-privatelesson";
  return "evt-default";
}

function getProgramMeta(title = "") {
  const t = title.toLowerCase();

  if (t.includes("public") && t.includes("skate")) {
    return {
      label: "Public Skate",
      pricing: "Admission - $14, Skate Rentals - $6",
      equipment: "",
      desc:
        "An open skate for all ages and abilities. Whether you're practicing your skills or just skating for fun!",
    };
  }

  if (t.includes("cosmic") && t.includes("skate")) {
    return {
      label: "Cosmic Skate",
      pricing:
        "Admission - 13 & Older - $20, 12 & Under $15, Skate Rentals - INCLUDED",
      equipment: "",
      desc:
        "Join us for Cosmic Skate — an atmosphere that turns skating into a party on ice. A unique twist on a classic skate, perfect for friends, families, and anyone looking for a fun night on ice full of music and lights.",
    };
  }

  if (t.includes("stick") && t.includes("puck")) {
    return {
      label: "Stick & Puck",
      pricing: "Admission - $20",
      equipment: "Helmet, Skates, Gloves, Stick",
      desc:
        "Stick & Puck is open ice time for individual skill development. Players can work on shooting, passing, stickhandling, and skating at their own pace—no organized games or scrimmages.",
    };
  }

  if (
    t.includes("lunchtime") &&
    t.includes("adult") &&
    t.includes("drop") &&
    t.includes("in") &&
    t.includes("hockey")
  ) {
    return {
      label: "Lunchtime Adult Drop-In Hockey",
      pricing: "$25",
      equipment: "Full Equipment Required",
      desc:
        "Lunchtime Adult Drop-In Hockey is a fast, fun midday skate built for adults who want to get on the ice without committing to a full league season. Expect a balanced pickup-style game (or organized shinny depending on turnout), a great workout, and a welcoming locker-room vibe for players of all levels.",
    };
  }

  if (t.includes("open") && t.includes("hockey")) {
    return {
      label: "Open Hockey",
      pricing: "Admission - $25",
      equipment: "Full Equipment Required",
      desc:
        "Open Hockey is a casual, non-league skate where players within a designated age group can sign-up, show up, and play in a fun, low-pressure game with a variety of other players of all skill levels. Just bring your gear and hit the ice!",
    };
  }

  if (t.includes("freestyle") || (t.includes("figure") && t.includes("skating"))) {
    return {
      label: "Freestyle",
      pricing: "Admission: $25 (Skaters) | $10 (Coaches)",
      equipment: "",
      desc:
        "Designated ice time for figure skaters only, providing a focused environment for individual practice and private lessons. These sessions are open to all levels—unless otherwise noted—and are ideal for skaters looking to improve jumps, spins, and moves in the field.\n\nSkaters must be familiar with standard ice patterns and etiquette to ensure a safe and productive experience for everyone. If your skater is new to Freestyle and unsure about the proper ice patterns, please ask a coach for a quick overview.",
    };
  }

  if (t.includes("private") && t.includes("lesson")) {
    return {
      label: "Private Lesson",
      pricing: "$25 per skater and $10 per coach",
      equipment: "",
      desc: "",
      note: "The above charge applies to each coach and each lesson participant for every private lesson at Wings Arena. These charges are separate from, and not included in the lesson cost. Lesson cost varies depending on the coach. Please check in at the front desk upon arrival.",
      footer: "For more info, please visit our Private Lessons page.",
    };
  }

  return { label: "Session", pricing: "", equipment: "", desc: "" };
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "'");
}

function extractNote(description = "") {
  const lines = String(description || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("note:")) return line.slice(5).trim();
  }
  return "";
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekSunday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function maxDate(a, b) {
  return a > b ? a : b;
}

function minDate(a, b) {
  return a < b ? a : b;
}

function daysBetween(start, end) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(end) - startOfDay(start)) / MS_PER_DAY);
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function buildICS(events, calName) {
  const esc = (s) =>
    String(s || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

  const dtFmt = (str) =>
    new Date(str).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const fold = (line) => {
    const out = [];
    while (line.length > 74) {
      out.push(line.slice(0, 74));
      line = " " + line.slice(74);
    }
    out.push(line);
    return out.join("\r\n");
  };

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
    const end = ev.end?.dateTime || ev.end?.date;
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
    lines.push(`LOCATION:Wings Arena`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export default function WingsCalendar() {
  const timeZone = import.meta.env.VITE_TZ || "America/New_York";
  const apiKey = (import.meta.env.VITE_GCAL_API_KEY || "").trim();
  const calendarId = (import.meta.env.VITE_GCAL_ID || "").trim();

  const slotMinTime = (import.meta.env.VITE_SLOT_MIN_TIME || "05:00:00").trim();
  const slotMaxTime = (import.meta.env.VITE_SLOT_MAX_TIME || "23:00:00").trim();
  const scrollTime = (import.meta.env.VITE_SCROLL_TIME || slotMinTime).trim();

  const tipRef = useRef(null);
  const moveMapRef = useRef(new WeakMap());
  const calendarRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const mobileFabRef = useRef(null);
  const addCalDropdownRef = useRef(null);
  const addCalMobileFabRef = useRef(null);

  const [hiddenTypes, setHiddenTypes] = useState(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewRange, setViewRange] = useState({ start: null, end: null });
  const [addCalOpen, setAddCalOpen] = useState(false);
  const [downloadType, setDownloadType] = useState("all");
  const [downloadLoading, setDownloadLoading] = useState(false);
  const lastDatesSetRef = useRef({
    isListView: null,
    startTime: null,
    endTime: null,
  });

  function toggleType(key) {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const MOBILE_QUERY = "(max-width: 750px)";
  const MOBILE_LIST_VIEW = "listFuture";

  const [isPhone, setIsPhone] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  // Important: on mobile, the initial FullCalendar view is already listFuture.
  // Start this as true on phones so the mobile-list CSS is active on the first paint.
  const [isListView, setIsListView] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (!apiKey || !calendarId) {
      console.warn("[WingsCalendar] Missing Google Calendar config:", {
        apiKeyPresent: !!apiKey,
        calendarIdPresent: !!calendarId,
        calendarIdPresentValue: calendarId,
      });
    }
  }, [apiKey, calendarId]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsPhone(e.matches);

    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);

    setIsPhone(mql.matches);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    const targetView = isPhone ? MOBILE_LIST_VIEW : "timeGridWeek";
    if (api.view?.type !== targetView) api.changeView(targetView);
  }, [isPhone]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const STYLE_ID = "wa-today-column-highlight";
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @media (min-width: 751px) {
        .wa-cal .fc .fc-timegrid-col.fc-day-today {
          background: rgba(255, 0, 0, 0.21) !important;
          box-shadow: inset 0 0 0 9999px rgba(223, 0, 56, 0.06) !important;
        }

        .wa-cal .fc .fc-col-header-cell.fc-day-today {
          background: rgba(223, 0, 56, 0.10) !important;
        }

        .wa-cal .fc .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion {
          position: relative;
        }
        .wa-cal .fc .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion::after {
          content: "";
          position: absolute;
          left: 10%;
          right: 10%;
          bottom: -6px;
          height: 2px;
          border-radius: 999px;
          background: rgba(223, 0, 56, 0.55);
          opacity: 0.55;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (!isPhone || !isListView) return;

    const fixStickyHeaders = () => {
      const stickyEls = document.querySelectorAll(
        ".fc-list-day.fc-list-sticky, .fc-list-sticky .fc-list-day > *, th.fc-list-day-cushion"
      );
      stickyEls.forEach((el) => {
        el.style.position = "static";
        el.style.top = "auto";
        el.style.zIndex = "auto";
        el.style.transform = "none";
      });
    };

    fixStickyHeaders();
    window.addEventListener("scroll", fixStickyHeaders, { passive: true });
    window.addEventListener("resize", fixStickyHeaders);

    return () => {
      window.removeEventListener("scroll", fixStickyHeaders);
      window.removeEventListener("resize", fixStickyHeaders);
    };
  }, [isPhone, isListView]);

  useEffect(() => {
    if (!filterOpen) return;
    const handle = (e) => {
      if (
        !e.target.closest(".wa-filter-dropdown") &&
        !e.target.closest(".fc-filterToggle-button") &&
        !e.target.closest(".wa-mobile-filter-fab")
      ) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [filterOpen]);

  useEffect(() => {
    if (!filterOpen || !filterDropdownRef.current) return;
    const isFab = isPhone && isListView && mobileFabRef.current;
    const btn = isFab
      ? mobileFabRef.current
      : document.querySelector(".fc-filterToggle-button");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const dropdown = filterDropdownRef.current;
    const dropdownWidth = dropdown.offsetWidth;
    const dropdownHeight = dropdown.offsetHeight;
    const left = Math.max(10, rect.right - dropdownWidth);
    if (isFab) {
      dropdown.style.top = `${rect.top - dropdownHeight - 8}px`;
    } else {
      dropdown.style.top = `${rect.bottom + 6}px`;
    }
    dropdown.style.left = `${left}px`;
  }, [filterOpen, isPhone, isListView]);

  useEffect(() => {
    const btn = document.querySelector(".fc-filterToggle-button");
    if (btn) btn.classList.toggle("wa-filter-active", hiddenTypes.size > 0);
  }, [hiddenTypes]);

  // Close add-cal dropdown on outside click
  useEffect(() => {
    if (!addCalOpen) return;
    const handle = (e) => {
      if (
        !e.target.closest(".wa-addcal-dropdown") &&
        !e.target.closest(".fc-addCal-button") &&
        !e.target.closest(".wa-addcal-fab")
      ) {
        setAddCalOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [addCalOpen]);

  // Position add-cal dropdown
  useEffect(() => {
    if (!addCalOpen || !addCalDropdownRef.current) return;
    const isFab = isPhone && isListView && addCalMobileFabRef.current;
    const btn = isFab
      ? addCalMobileFabRef.current
      : document.querySelector(".fc-addCal-button");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const dropdown = addCalDropdownRef.current;
    const dropdownWidth = dropdown.offsetWidth;
    const dropdownHeight = dropdown.offsetHeight;
    const left = Math.max(10, rect.right - dropdownWidth);
    if (isFab) {
      dropdown.style.top = `${rect.top - dropdownHeight - 8}px`;
    } else {
      dropdown.style.top = `${rect.bottom + 6}px`;
    }
    dropdown.style.left = `${left}px`;
  }, [addCalOpen, isPhone, isListView]);

  async function handleDownloadICS() {
    setDownloadLoading(true);
    try {
      const now = new Date();
      const future = new Date();
      future.setMonth(future.getMonth() + 6);
      const endpoint =
        `https://www.googleapis.com/calendar/v3/calendars/` +
        `${encodeURIComponent(calendarId)}/events` +
        `?key=${apiKey}` +
        `&timeMin=${now.toISOString()}` +
        `&timeMax=${future.toISOString()}` +
        `&singleEvents=true&orderBy=startTime&maxResults=500`;

      const res = await fetch(endpoint);
      const json = await res.json();
      const items = json.items || [];

      const filtered =
        downloadType === "all"
          ? items
          : items.filter(
              (ev) => getClassForTitle(ev.summary || "") === downloadType
            );

      const label =
        downloadType === "all"
          ? "Full Schedule"
          : EVENT_TYPES.find((t) => t.key === downloadType)?.label || "Sessions";

      const ics = buildICS(filtered, label);
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wings-arena-${label.toLowerCase().replace(/\s+/g, "-")}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[WingsCalendar] ICS download failed:", err);
    } finally {
      setDownloadLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (tipRef.current) {
        tipRef.current.remove();
        tipRef.current = null;
      }
    };
  }, []);

  function ensureTooltipEl() {
    if (tipRef.current) return tipRef.current;
    const el = document.createElement("div");
    el.className = "wa-tooltip";
    document.body.appendChild(el);
    tipRef.current = el;
    return el;
  }

  function positionTooltip(el, mouseEvent) {
    const offsetX = 15;
    const offsetY = -230;
    const pad = 10;

    el.style.visibility = "hidden";
    const rect = el.getBoundingClientRect();

    let x = mouseEvent.clientX + offsetX;
    let y = mouseEvent.clientY + offsetY;

    if (x + rect.width > window.innerWidth - pad)
      x = window.innerWidth - rect.width - pad;
    if (y + rect.height > window.innerHeight - pad)
      y = window.innerHeight - rect.height - pad;
    if (x < pad) x = pad;
    if (y < pad) y = pad;

    el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(
      y
    )}px, 0)`;
    el.style.visibility = "visible";
  }

  function showTooltip(info) {
    const el = ensureTooltipEl();
    const start = info.event.start;
    const end = info.event.end || info.event?._instance?.range?.end || null;
    const cal = info.view.calendar;

    const dateStr = start
      ? cal.formatDate(start, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          omitCommas: true,
        })
      : "";

    let timeStr = "";
    if (start && end) {
      timeStr = cal.formatRange(start, end, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        meridiem: "short",
        omitCommas: true,
      });
    } else if (start) {
      timeStr = cal.formatDate(start, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        meridiem: "short",
        omitCommas: true,
      });
    }

    const meta = getProgramMeta(info.event.title);
    const descHtml = meta.desc ? escapeHtml(meta.desc) : "";

    const gDesc = info.event.extendedProps?.description || "";
    const note = extractNote(gDesc);

    el.innerHTML = `
      <div class="wa-tipTitle">${escapeHtml(info.event.title || "")}</div>
      <div class="wa-tipRow">
        <span class="wa-tipLabel">Date</span>
        <span class="wa-tipValue">${escapeHtml(dateStr)}</span>
      </div>
      <div class="wa-tipRow">
        <span class="wa-tipLabel">Time</span>
        <span class="wa-tipValue wa-tipTime">${escapeHtml(timeStr)}</span>
      </div>

      ${
        note
          ? `<div class="wa-tipRow wa-tipAdvisory">
               <span class="wa-tipLabel">Note</span>
               <span class="wa-tipValue">
                 <span class="wa-adv-pill wa-adv-note">NOTE</span>
                 <span class="wa-tipAdvText">${escapeHtml(note)}</span>
               </span>
             </div>`
          : ""
      }

      ${
        meta.pricing
          ? `<div class="wa-tipRow">
               <span class="wa-tipLabel">Pricing</span>
               <span class="wa-tipValue">${escapeHtml(meta.pricing)}</span>
             </div>`
          : ""
      }
      ${
        meta.equipment
          ? `<div class="wa-tipRow">
               <span class="wa-tipLabel">Equipment</span>
               <span class="wa-tipValue">${escapeHtml(meta.equipment)}</span>
             </div>`
          : ""
      }
      ${
        meta.desc
          ? `<div class="wa-tipDesc">${escapeHtml(descHtml)}</div>`
          : ""
      }
      ${
        meta.note
          ? `<div class="wa-tipDesc">NOTE: ${escapeHtml(meta.note)}</div>`
          : ""
      }
      ${
        meta.footer
          ? `<div class="wa-tipDesc">${escapeHtml(meta.footer)}</div>`
          : ""
      }
    `;

    el.classList.add("is-visible");
    positionTooltip(el, info.jsEvent);
  }

  function hideTooltip() {
    const el = tipRef.current;
    if (!el) return;
    el.classList.remove("is-visible");
  }

  function goMobileListPrev() {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;

    const today = startOfToday();
    const currentDate = new Date(api.getDate());
    currentDate.setHours(0, 0, 0, 0);

    const currentWeekStart = startOfWeekSunday(currentDate);
    const todayWeekStart = startOfWeekSunday(today);

    if (isSameDay(currentWeekStart, todayWeekStart)) {
      api.gotoDate(today);
      return;
    }

    const prevWeekStart = addDays(currentWeekStart, -7);

    if (prevWeekStart < todayWeekStart) {
      api.gotoDate(today);
      return;
    }

    api.gotoDate(prevWeekStart);
  }

  function goMobileListNext() {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;

    const today = startOfToday();
    const currentDate = new Date(api.getDate());
    currentDate.setHours(0, 0, 0, 0);

    const currentWeekStart = startOfWeekSunday(currentDate);
    const todayWeekStart = startOfWeekSunday(today);

    if (isSameDay(currentWeekStart, todayWeekStart)) {
      api.gotoDate(addDays(todayWeekStart, 7));
      return;
    }

    api.gotoDate(addDays(currentWeekStart, 7));
  }

  const leftButtons = isPhone ? "mobilePrev,mobileNext" : "prev,next today";
  const rightButtons = isPhone
    ? `timeGridWeek,timeGridDay,${MOBILE_LIST_VIEW},filterToggle`
    : "timeGridWeek,timeGridDay,filterToggle,addCal";

  // Mobile list view should flow naturally. A fixed/100% FullCalendar height can
  // collapse inside embeds/iframes and make the list appear blank.
  const calendarHeight = isPhone ? "auto" : "100vh";
  const calendarContentHeight = isPhone ? "auto" : "auto";

  const closureVisible = Boolean(
    viewRange.start &&
    viewRange.end &&
    rangesOverlap(viewRange.start, viewRange.end, CLOSURE_START, CLOSURE_END)
  );

  const closurePlacement = (() => {
    if (!closureVisible || !viewRange.start || !viewRange.end) return null;

    if (isListView) {
      return { rowStyle: undefined, pillStyle: undefined };
    }

    // FullCalendar gives UTC midnight dates — use UTC arithmetic to avoid
    // local-timezone shifts turning Sunday UTC into Saturday local time.
    const toUTC = (d) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const utcDaysBetween = (a, b) =>
      Math.round((toUTC(b) - toUTC(a)) / (24 * 60 * 60 * 1000));

    const closureStartUTC = new Date(Date.UTC(2026, 5, 29)); // June 29
    const closureEndUTC   = new Date(Date.UTC(2026, 6, 5));  // July 5 exclusive

    const visibleStart = toUTC(viewRange.start);
    const visibleEnd   = toUTC(viewRange.end);
    const pillStart    = new Date(Math.max(visibleStart.getTime(), closureStartUTC.getTime()));
    const pillEnd      = new Date(Math.min(visibleEnd.getTime(),   closureEndUTC.getTime()));

    const totalDays       = Math.max(1, utcDaysBetween(visibleStart, visibleEnd));
    const startOffsetDays = Math.max(0, utcDaysBetween(visibleStart, pillStart));
    const spanDays        = Math.max(1, utcDaysBetween(pillStart, pillEnd));

    return {
      rowStyle:  { "--wa-visible-day-count": totalDays },
      pillStyle: { gridColumn: `${startOffsetDays + 2} / span ${spanDays}` },
    };
  })();

  return (
    <div
      className={[
        "wa-cal",
        isPhone ? "is-phone" : "",
        isPhone && isListView ? "is-phone-list" : "",
        ...[...hiddenTypes].map((t) => `wa-hide-${t.replace("evt-", "")}`),
      ].filter(Boolean).join(" ")}
    >
      {closureVisible && isListView && (
        <div className="wa-closure-pill wa-closure-pill--list">
          <span className="wa-closure-pill-title">Closed for Facility Improvements</span>
          <span className="wa-closure-pill-body">
            Wings Arena will be closed from <strong>{formatMonthDay(CLOSURE_START)}</strong> through{" "}
            <strong>{formatMonthDay(addDays(CLOSURE_END, -1))}</strong> for scheduled facility improvements.
            No programs or ice sessions will take place during this closure. Thank you for your patience and understanding.
          </span>
        </div>
      )}

      <FullCalendar
        ref={calendarRef}
        plugins={[
          timeGridPlugin,
          listPlugin,
          interactionPlugin,
          googleCalendarPlugin,
        ]}
        customButtons={{
          mobilePrev: {
            text: "<",
            click: goMobileListPrev,
          },
          mobileNext: {
            text: ">",
            click: goMobileListNext,
          },
          filterToggle: {
            text: "Filter",
            click: () => setFilterOpen((prev) => !prev),
          },
          addCal: {
            text: "+ Add to Calendar",
            click: () => setAddCalOpen((prev) => !prev),
          },
        }}
        initialView={isPhone ? MOBILE_LIST_VIEW : "timeGridWeek"}
        headerToolbar={{
          left: leftButtons,
          center: "title",
          right: rightButtons,
        }}
        views={{
          listFuture: {
            type: "list",
            duration: { days: 7 },
            buttonText: "List",
            visibleRange(currentDate) {
              const today = startOfToday();

              const requested = new Date(currentDate);
              requested.setHours(0, 0, 0, 0);

              const requestedWeekStart = startOfWeekSunday(requested);
              const todayWeekStart = startOfWeekSunday(today);

              const isCurrentWeek = isSameDay(requestedWeekStart, todayWeekStart);

              const rangeStart = isCurrentWeek ? today : requestedWeekStart;
              const rangeEnd = addDays(rangeStart, 7);

              return {
                start: rangeStart,
                end: rangeEnd,
              };
            },
          },
        }}
        height={calendarHeight}
        contentHeight={calendarContentHeight}
        allDaySlot={false}
        expandRows={!isPhone}
        nowIndicator
        timeZone={timeZone}
        googleCalendarApiKey={apiKey}
        events={{ googleCalendarId: calendarId }}
        slotLabelFormat={{
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          meridiem: "short",
        }}
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          meridiem: "short",
        }}
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
        scrollTime={scrollTime}
        eventClassNames={(arg) => {
          const desc = arg.event.extendedProps?.description || "";
          const note = extractNote(desc);
          return [
            getClassForTitle(arg.event.title),
            note ? "wa-adv-note" : "",
          ].filter(Boolean);
        }}
        listDayFormat={{
          weekday: "long",
        }}
        listDaySideFormat={{
          month: "long",
          day: "numeric",
        }}
        stickyHeaderDates={false}
        datesSet={(arg) => {
          const nextIsListView = Boolean(arg.view.type?.startsWith("list"));
          const nextStartTime = arg.start?.getTime?.() ?? null;
          const nextEndTime = arg.end?.getTime?.() ?? null;

          const last = lastDatesSetRef.current;
          const hasActuallyChanged =
            last.isListView !== nextIsListView ||
            last.startTime !== nextStartTime ||
            last.endTime !== nextEndTime;

          if (!hasActuallyChanged) return;

          lastDatesSetRef.current = {
            isListView: nextIsListView,
            startTime: nextStartTime,
            endTime: nextEndTime,
          };

          setIsListView(nextIsListView);
          setViewRange({ start: arg.start, end: arg.end });
        }}
        eventDidMount={(info) => {
          info.el
            .querySelectorAll(
              ".wa-adv-pill, .wa-adv-noteText, .wa-register-wrap, .wa-list-register-wrap"
            )
            .forEach((n) => n.remove());

          const isLunchtime =
            getClassForTitle(info.event.title) === "evt-lunchtime-dropin";
          if (!isLunchtime) return;

          const makeRsvpLink = () => {
            const link = document.createElement("a");
            link.className = "wa-register-link";
            link.href = LUNCHTIME_RSVP_URL;
            link.textContent = "RSVP";
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            link.addEventListener("click", (e) => {
              e.stopPropagation();
            });

            return link;
          };

          if (info.view.type?.startsWith("timeGrid")) {
            const main = info.el.querySelector(".fc-event-main");
            if (!main) return;

            const timeEl = main.querySelector(".fc-event-time");
            if (!timeEl) return;

            const wrap = document.createElement("div");
            wrap.className = "wa-register-wrap";
            wrap.appendChild(makeRsvpLink());
            timeEl.insertAdjacentElement("afterend", wrap);
            return;
          }

          if (info.view.type?.startsWith("list")) {
            const titleCell = info.el.querySelector("td.fc-list-event-title");
            if (!titleCell) return;

            const anchor = titleCell.querySelector("a");
            const wrap = document.createElement("div");
            wrap.className = "wa-list-register-wrap";
            wrap.appendChild(makeRsvpLink());

            if (anchor) anchor.insertAdjacentElement("afterend", wrap);
            else titleCell.appendChild(wrap);
          }
        }}
        eventMouseEnter={(info) => {
          if (isPhone) return;
          showTooltip(info);

          const move = (ev) => {
            if (
              tipRef.current &&
              tipRef.current.classList.contains("is-visible")
            ) {
              positionTooltip(tipRef.current, ev);
            }
          };
          moveMapRef.current.set(info.el, move);
          info.el.addEventListener("mousemove", move);
        }}
        eventMouseLeave={(info) => {
          if (isPhone) return;
          const move = moveMapRef.current.get(info.el);
          if (move) {
            info.el.removeEventListener("mousemove", move);
            moveMapRef.current.delete(info.el);
          }
          hideTooltip();
        }}
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          info.jsEvent.stopPropagation();
        }}
        eventSourceFailure={(error) => {
          console.error("[WingsCalendar] Google event source failed:", error);
        }}
      />

      {closureVisible && !isListView && (
        <div className="wa-closure-row" style={closurePlacement?.rowStyle}>
          <div className="wa-closure-pill" style={closurePlacement?.pillStyle}>
            <span className="wa-closure-pill-title">Closed for Facility Improvements</span>
            <span className="wa-closure-pill-body">
              Wings Arena will be closed from <strong>{formatMonthDay(CLOSURE_START)}</strong> through{" "}
              <strong>{formatMonthDay(addDays(CLOSURE_END, -1))}</strong> for scheduled facility improvements.
              No programs or ice sessions will take place during this closure. Thank you for your patience and understanding.
            </span>
          </div>
        </div>
      )}

      {isPhone && isListView && (
        <button
          ref={mobileFabRef}
          className={`wa-mobile-filter-fab${hiddenTypes.size > 0 ? " wa-filter-active" : ""}`}
          onClick={(e) => { e.currentTarget.blur(); setFilterOpen((prev) => !prev); }}
          aria-label="Filter events"
        >
        </button>
      )}

      <button
        ref={addCalMobileFabRef}
        className="wa-addcal-fab"
        onClick={(e) => { e.currentTarget.blur(); setAddCalOpen((prev) => !prev); }}
        aria-label="Add to Calendar"
      >
      </button>

      {addCalOpen && (
        <div
          className="wa-addcal-backdrop"
          onClick={() => setAddCalOpen(false)}
        />
      )}

      {addCalOpen && (
        <div ref={addCalDropdownRef} className="wa-addcal-dropdown">
          <div className="wa-addcal-section">
            <p className="wa-addcal-section-title">Session Type</p>
            <select
              className="wa-addcal-select"
              value={downloadType}
              onChange={(e) => setDownloadType(e.target.value)}
            >
              <option value="all">All Sessions</option>
              {EVENT_TYPES.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="wa-addcal-divider" />
          <div className="wa-addcal-section">
            <p className="wa-addcal-section-title">Add to Calendar (Live Updates)</p>
            {(() => {
              const workerFeedUrl = `${ICAL_WORKER_URL}?type=${downloadType}&calId=${encodeURIComponent(calendarId)}`;
              const webcalUrl =
                downloadType === "all"
                  ? `webcal://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`
                  : workerFeedUrl.replace("https://", "webcal://");
              const googleUrl =
                downloadType === "all"
                  ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarId)}`
                  : `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
              return (
                <>
                  <a
                    className="wa-addcal-link"
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="wa-addcal-link-icon wa-addcal-link-icon--google"></span>
                    Add to Google Calendar
                  </a>
                  <a
                    className="wa-addcal-link"
                    href={webcalUrl}
                  >
                    <span className="wa-addcal-link-icon wa-addcal-link-icon--ical"></span>
                    Subscribe in Apple / Outlook
                  </a>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {filterOpen && (
        <div ref={filterDropdownRef} className="wa-filter-dropdown">
          <div className="wa-filter-top-row">
            <span className="wa-filter-header">Filter by Type</span>
            <button
              className="wa-filter-toggle-all"
              onClick={() => {
                if (hiddenTypes.size === 0) {
                  setHiddenTypes(new Set(EVENT_TYPES.map((t) => t.key)));
                } else {
                  setHiddenTypes(new Set());
                }
              }}
            >
              {hiddenTypes.size === 0 ? "Clear All" : "Select All"}
            </button>
          </div>
          {EVENT_TYPES.map(({ key, label, color }) => (
            <label key={key} className="wa-filter-item">
              <input
                type="checkbox"
                checked={!hiddenTypes.has(key)}
                onChange={() => toggleType(key)}
              />
              <span className="wa-filter-dot" style={{ background: color }} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}