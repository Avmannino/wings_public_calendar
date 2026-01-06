// src/components/WingsCalendar.jsx

import { useEffect, useRef, useState } from "react";
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
  if (t.includes("freestyle") || (t.includes("figure") && t.includes("skating")))
    return "evt-freestyle";
  if (t.includes("open") && t.includes("hockey")) return "evt-openhockey";
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

/**
 * ✅ SIMPLE, SAFE: Manual advisories you can edit any time.
 * These show above the calendar when the current view overlaps the advisory range.
 *
 * Date format: YYYY-MM-DD (local)
 */
const MANUAL_ADVISORIES = [
  // Example based on what you said:
  // Cosmic Skate normally 7:30–9:30, but THIS WEEK it's 8:35–9:35.
  {
    id: "cosmic-fri-time-change",
    start: "2026-01-09", // <-- change these dates to the week it applies
    end: "2026-01-10",   // end is exclusive (the next day is fine)
    pill: "TIME CHANGE",
    message: " Friday Cosmic Skate is 8:35pm–9:35pm this week (instead of 7:30pm–9:30pm).",
  },
];

// Helpers for advisory range checks
function parseYMD(ymd) {
  // ymd = "2026-01-09"
  const [y, m, d] = String(ymd).split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function extractNote(description = "") {
  const lines = String(description || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("note:")) return line.slice(5).trim();
    if (lower.startsWith("advisory:")) return line.slice(9).trim();
  }
  return "";
}

function isCancelled(title = "", description = "") {
  const t = String(title).toLowerCase();
  const d = String(description).toLowerCase();
  return (
    t.includes("cancelled") ||
    t.includes("canceled") ||
    d.includes("cancelled") ||
    d.includes("canceled")
  );
}

export default function WingsCalendar() {
  const timeZone = import.meta.env.VITE_TZ || "America/New_York";
  const apiKey = (import.meta.env.VITE_GCAL_API_KEY || "").trim();
  const calendarId = (import.meta.env.VITE_GCAL_ID || "").trim();

  // ✅ FIX: your Freestyle events are around 5:30am, but you were hiding anything before 7:00am.
  // You can override these in .env if you want.
  const slotMinTime = (import.meta.env.VITE_SLOT_MIN_TIME || "05:00:00").trim();
  const slotMaxTime = (import.meta.env.VITE_SLOT_MAX_TIME || "23:00:00").trim();
  const scrollTime = (import.meta.env.VITE_SCROLL_TIME || slotMinTime).trim();

  const tipRef = useRef(null);
  const moveMapRef = useRef(new WeakMap());
  const calendarRef = useRef(null);

  // BREAKPOINT: list view at <= 750px
  const MOBILE_QUERY = "(max-width: 750px)";

  const [isPhone, setIsPhone] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });
  const [isListView, setIsListView] = useState(false);

  // ✅ NEW: advisories shown above calendar for the current view range
  const [activeAdvisories, setActiveAdvisories] = useState([]);

  useEffect(() => {
    if (!apiKey || !calendarId) {
      console.warn("[WingsCalendar] Missing Google Calendar config:", {
        apiKeyPresent: !!apiKey,
        calendarIdPresent: !!calendarId,
        calendarId,
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

  // Switch between timeGridWeek and listWeek based on breakpoint
  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    const targetView = isPhone ? "listWeek" : "timeGridWeek";
    if (api.view?.type !== targetView) api.changeView(targetView);
  }, [isPhone]);

  // Ensure list headers are never sticky on phones
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
    const descHtml = meta.desc
      ? escapeHtml(meta.desc).replaceAll("\n\n", "<br><br>")
      : "";

    const gDesc = info.event.extendedProps?.description || "";
    const note = extractNote(gDesc);
    const cancelled = isCancelled(info.event.title, gDesc);

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
        cancelled
          ? `<div class="wa-tipRow wa-tipAdvisory">
               <span class="wa-tipLabel">Advisory</span>
               <span class="wa-tipValue">
                 <span class="wa-adv-pill wa-adv-cancelled">CANCELLED</span>
                 <span class="wa-tipAdvText">${escapeHtml(note || "This session has been cancelled.")}</span>
               </span>
             </div>`
          : note
          ? `<div class="wa-tipRow wa-tipAdvisory">
               <span class="wa-tipLabel">Advisory</span>
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
      ${meta.desc ? `<div class="wa-tipDesc">${descHtml}</div>` : ""}
    `;

    el.classList.add("is-visible");
    positionTooltip(el, info.jsEvent);
  }

  function hideTooltip() {
    const el = tipRef.current;
    if (!el) return;
    el.classList.remove("is-visible");
  }

  // ✅ updates banner based on current view date range
  function updateActiveAdvisories(viewStart, viewEnd) {
    const filtered = [];
    for (const adv of MANUAL_ADVISORIES) {
      const aStart = parseYMD(adv.start);
      const aEnd = parseYMD(adv.end);
      if (!aStart || !aEnd) continue;
      if (rangesOverlap(aStart, aEnd, viewStart, viewEnd)) filtered.push(adv);
    }
    setActiveAdvisories(filtered);
  }

  const rightButtons = isPhone
    ? "timeGridWeek,timeGridDay,listWeek"
    : "timeGridWeek,timeGridDay";

  const calendarHeight = isPhone ? "auto" : "100vh";

  return (
    <div
      className={[
        "wa-cal",
        isPhone ? "is-phone" : "",
        isPhone && isListView ? "is-phone-list" : "",
      ].join(" ")}
    >
      {/* ✅ NEW: clean advisory banner */}
      {activeAdvisories.length > 0 && (
        <div className="wa-advisoryBar" role="status" aria-live="polite">
          <div className="wa-advisoryBarTitle">Schedule Advisories</div>
          <ul className="wa-advisoryList">
            {activeAdvisories.map((a) => (
              <li key={a.id}>
                <span
                  className={[
                    "wa-adv-pill",
                    a.pill?.toLowerCase().includes("cancel")
                      ? "wa-adv-cancelled"
                      : a.pill?.toLowerCase().includes("time")
                      ? "wa-adv-time-change"
                      : "wa-adv-note",
                  ].join(" ")}
                >
                  {a.pill || "NOTE"}
                </span>
                <span className="wa-adv-itemText">{a.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, listPlugin, interactionPlugin, googleCalendarPlugin]}
        initialView={isPhone ? "listWeek" : "timeGridWeek"}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: rightButtons,
        }}
        height={calendarHeight}
        contentHeight={isPhone ? "auto" : "auto"}
        allDaySlot={false}
        expandRows
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

        // ✅ FIX: show early-morning events like your 5:30am Freestyle sessions
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
        scrollTime={scrollTime}

        eventClassNames={(arg) => {
          const desc = arg.event.extendedProps?.description || "";
          const cancelled = isCancelled(arg.event.title, desc);
          const note = extractNote(desc);
          return [
            getClassForTitle(arg.event.title),
            cancelled ? "wa-adv-cancelled" : "",
            !cancelled && note ? "wa-adv-note" : "",
          ].filter(Boolean);
        }}

        stickyHeaderDates={false}
        datesSet={(arg) => {
          setIsListView(arg.view.type?.startsWith("list"));

          // ✅ keep advisory bar in sync with current view range
          // view.currentStart/currentEnd are reliable
          const viewStart = arg.view?.currentStart || arg.start;
          const viewEnd = arg.view?.currentEnd || arg.end;
          if (viewStart && viewEnd) updateActiveAdvisories(viewStart, viewEnd);
        }}

        eventDidMount={(info) => {
          // ✅ add small badge for NOTE/CANCELLED (safe + lightweight)
          const desc = info.event.extendedProps?.description || "";
          const note = extractNote(desc);
          const cancelled = isCancelled(info.event.title, desc);

          // remove prior injected badge/note (avoid duplicates on rerender)
          info.el.querySelectorAll(".wa-adv-pill, .wa-adv-noteText").forEach((n) => n.remove());

          if (!cancelled && !note) return;

          const pill = document.createElement("span");
          pill.className = `wa-adv-pill ${cancelled ? "wa-adv-cancelled" : "wa-adv-note"}`;
          pill.textContent = cancelled ? "CANCELLED" : "NOTE";

          if (info.view.type?.startsWith("list")) {
            const a = info.el.querySelector(".fc-list-event-title a");
            if (a) {
              pill.style.marginRight = "8px";
              a.prepend(pill);
            }
            if (note) {
              const titleCell = info.el.querySelector("td.fc-list-event-title");
              if (titleCell) {
                const noteEl = document.createElement("div");
                noteEl.className = "wa-adv-noteText";
                noteEl.textContent = note;
                titleCell.appendChild(noteEl);
              }
            }
          } else {
            const main = info.el.querySelector(".fc-event-main");
            if (main) {
              main.prepend(pill);
            } else {
              info.el.prepend(pill);
            }
          }
        }}

        eventMouseEnter={(info) => {
          if (isPhone) return;
          showTooltip(info);

          const move = (ev) => {
            if (tipRef.current && tipRef.current.classList.contains("is-visible")) {
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
          if (info.event.url) {
            window.open(info.event.url, "_blank", "noopener,noreferrer");
          }
        }}
        eventSourceFailure={(error) => {
          console.error("[WingsCalendar] Google event source failed:", error);
        }}
      />
    </div>
  );
}
