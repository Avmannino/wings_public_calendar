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
  if (t.includes("freestyle")) return "evt-freestyle";
  if (t.includes("open") && t.includes("hockey")) return "evt-openhockey";
  return "evt-default";
}

function getProgramMeta(title = "") {
  const t = title.toLowerCase();

  if (t.includes("public") && t.includes("skate")) {
    return {
      label: "Public Skate",
      pricing: "Admission - $14, Skate Rentals - $6",
      desc:
        "An open skate for all ages and abilities. Whether you're practicing your skills or just skating for fun!",
    };
  }

  if (t.includes("cosmic") && t.includes("skate")) {
    return {
      label: "Cosmic Skate",
      pricing:
        "Admission - 13 & Older - $20, 12 & Under $15, Skate Rentals - INCLUDED",
      desc:
        "Join us for Cosmic Skate — an atmosphere that turns skating into a party on ice. A unique twist on a classic skate, perfect for friends, families, and anyone looking for a fun night on ice full of music and lights.",
    };
  }

  if (t.includes("stick") && t.includes("puck")) {
    return {
      label: "Stick & Puck",
      pricing: "Admission - $20",
      desc:
        "Stick & Puck is open ice time for individual skill development. Players can work on shooting, passing, stickhandling, and skating at their own pace—no organized games or scrimmages.",
    };
  }

  if (t.includes("open") && t.includes("hockey")) {
    return {
      label: "Open Hockey",
      pricing: "Admission - $25",
      desc:
        "Open Hockey is a casual, non-league skate where players within a designated age group can sign-up, show up, and play in a fun, low-pressure game with a variety of other players of all skill levels. Just bring your gear and hit the ice!",
    };
  }

  if (t.includes("freestyle")) {
    return {
      label: "Freestyle",
      pricing: "Admission - $20",
      desc:
        "Freestyle sessions are designated ice time for figure skaters only, providing a focused environment for individual practice and private lessons. These sessions are open to all levels—unless otherwise noted—and are ideal for skaters looking to improve jumps, spins, and moves in the field.",
    };
  }

  return { label: "Session", pricing: "", desc: "" };
}

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function WingsCalendar() {
  const timeZone = import.meta.env.VITE_TZ || "America/New_York";
  const apiKey = (import.meta.env.VITE_GCAL_API_KEY || "").trim();
  const calendarId = (import.meta.env.VITE_GCAL_ID || "").trim();

  const tipRef = useRef(null);
  const moveMapRef = useRef(new WeakMap());

  // ✅ Calendar API ref (needed to force view changes on resize)
  const calendarRef = useRef(null);

  // ✅ phone-only breakpoint (treat <= 640px as “mobile phone”)
  const MOBILE_QUERY = "(max-width: 640px)";

  const [isPhone, setIsPhone] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  // ✅ track whether current view is list (so CSS can target toolbar correctly)
  const [isListView, setIsListView] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return;

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

  // ✅ force listWeek as the default view on phones,
  // and switch back to week view when leaving phone size.
  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;

    const targetView = isPhone ? "listWeek" : "timeGridWeek";
    if (api.view?.type !== targetView) api.changeView(targetView);
  }, [isPhone]);

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

    if (x + rect.width > window.innerWidth - pad) x = window.innerWidth - rect.width - pad;
    if (y + rect.height > window.innerHeight - pad) y = window.innerHeight - rect.height - pad;
    if (x < pad) x = pad;
    if (y < pad) y = pad;

    el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
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
        meta.pricing
          ? `<div class="wa-tipRow">
               <span class="wa-tipLabel">Pricing</span>
               <span class="wa-tipValue">${escapeHtml(meta.pricing)}</span>
             </div>`
          : ""
      }
      ${meta.desc ? `<div class="wa-tipDesc">${escapeHtml(meta.desc)}</div>` : ""}
    `;

    el.classList.add("is-visible");
    positionTooltip(el, info.jsEvent);
  }

  function hideTooltip() {
    const el = tipRef.current;
    if (!el) return;
    el.classList.remove("is-visible");
  }

  // ✅ list button ONLY on phones (keeps desktop/tablet clean)
  const rightButtons = isPhone
    ? "timeGridWeek,timeGridDay,listWeek"
    : "timeGridWeek,timeGridDay";

  return (
    <div
      className={[
        "wa-cal",
        isPhone ? "is-phone" : "",
        isPhone && isListView ? "is-phone-list" : "",
      ].join(" ")}
    >
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, listPlugin, interactionPlugin, googleCalendarPlugin]}
        initialView={isPhone ? "listWeek" : "timeGridWeek"}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: rightButtons,
        }}
        height="auto"
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
        slotMinTime="05:00:00"
        slotMaxTime="24:00:00"
        scrollTime="05:00:00"
        eventClassNames={(arg) => [getClassForTitle(arg.event.title)]}
        // ✅ update isListView anytime FC changes view (needed for toolbar hiding)
        datesSet={(arg) => setIsListView(arg.view.type?.startsWith("list"))}
        eventMouseEnter={(info) => {
          if (isPhone) return; // no hover tooltips on touch
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
