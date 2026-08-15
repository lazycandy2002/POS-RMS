import { useState, useEffect } from "react"
import DashboardLayout from "../Layout/DashboardLayout"
import { supabase } from "../supabaseClient"

const PH_HOLIDAYS = [
  { date: "2025-01-01", name: "New Year's Day" },
  { date: "2025-04-09", name: "Araw ng Kagitingan" },
  { date: "2025-04-17", name: "Maundy Thursday" },
  { date: "2025-04-18", name: "Good Friday" },
  { date: "2025-05-01", name: "Labor Day" },
  { date: "2025-06-12", name: "Independence Day" },
  { date: "2025-08-25", name: "National Heroes Day" },
  { date: "2025-11-01", name: "All Saints Day" },
  { date: "2025-11-30", name: "Bonifacio Day" },
  { date: "2025-12-08", name: "Immaculate Conception" },
  { date: "2025-12-24", name: "Christmas Eve" },
  { date: "2025-12-25", name: "Christmas Day" },
  { date: "2025-12-30", name: "Rizal Day" },
  { date: "2025-12-31", name: "New Year's Eve" },
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-04-02", name: "Maundy Thursday" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-04-09", name: "Araw ng Kagitingan" },
  { date: "2026-05-01", name: "Labor Day" },
  { date: "2026-06-12", name: "Independence Day" },
  { date: "2026-08-31", name: "National Heroes Day" },
  { date: "2026-11-01", name: "All Saints Day" },
  { date: "2026-11-30", name: "Bonifacio Day" },
  { date: "2026-12-08", name: "Immaculate Conception" },
  { date: "2026-12-24", name: "Christmas Eve" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-30", name: "Rizal Day" },
  { date: "2026-12-31", name: "New Year's Eve" },
]

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function buildMaps(userEvents) {
  const hm = {}, em = {}
  PH_HOLIDAYS.forEach((h) => { (hm[h.date] = hm[h.date] || []).push({ ...h, type: "holiday" }) })
  userEvents.forEach((e) => { (em[e.date] = em[e.date] || []).push({ ...e, type: "user" }) })
  return { hm, em }
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onCancel, busy }) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === "Escape") onCancel() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div style={{ ...S.modalOverlay, zIndex: 150 }}>
      <div style={{ ...S.modal, width: 320 }}>
        <div style={S.modalTitle}>{title}</div>
        <div style={S.confirmMsg}>{message}</div>
        <div style={S.modalFooter}>
          <button style={S.mCancel} disabled={busy} onClick={onCancel}>Cancel</button>
          <button
            style={{ ...S.mDelSolid, opacity: busy ? 0.6 : 1 }}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Deleting…" : (confirmLabel || "Delete")}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Notes Board ──────────────────────────────────────────────────────────────
function NoteModal({ open, editingNote, onSave, onClose, saving }) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  useEffect(() => {
    if (open) {
      setTitle(editingNote?.title || "")
      setContent(editingNote?.content || "")
    }
  }, [open, editingNote])

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div style={S.modalOverlay}>
      <div style={S.modal}>
        <div style={S.modalTitle}>{editingNote ? "Edit note" : "Add note"}</div>

        <div style={S.fg}>
          <label style={S.fLabel}>Title</label>
          <input
            style={S.fInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Restock reminder"
          />
        </div>
        <div style={S.fg}>
          <label style={S.fLabel}>Content</label>
          <textarea
            style={{ ...S.fInput, height: 90, resize: "vertical" }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Optional details…"
          />
        </div>

        <div style={S.modalFooter}>
          <button style={S.mCancel} disabled={saving} onClick={onClose}>Cancel</button>
          <button
            style={{ ...S.mSave, opacity: saving ? 0.6 : 1 }}
            disabled={saving}
            onClick={() => {
              if (!title.trim()) return
              onSave({ title: title.trim(), content: content.trim() })
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

function NotesBoard({ notes, loading, onAdd, onEdit, onDelete }) {
  return (
    <div style={S.notesShell}>
      <div style={S.notesTop}>
        <div style={S.notesTitle}>Notes Board</div>
        <button style={S.addNoteBtn} onClick={onAdd}>+ Add note</button>
      </div>

      {loading ? (
        <div style={S.loadingBar}>Loading notes…</div>
      ) : notes.length === 0 ? (
        <div style={S.notesEmpty}>No notes yet. Click "+ Add note" to create one.</div>
      ) : (
        <div style={S.notesScroll}>
          {notes.map((n) => (
            <div key={n.id} style={S.noteCard}>
              <div style={S.noteCardTop}>
                <div style={S.noteCardTitle}>{n.title}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button style={S.noteIcBtn} onClick={() => onEdit(n)}>✎</button>
                  <button style={{ ...S.noteIcBtn, color: "#A32D2D" }} onClick={() => onDelete(n.id)}>🗑</button>
                </div>
              </div>
              {n.content && <div style={S.noteCardContent}>{n.content}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Event Modal ──────────────────────────────────────────────────────────────
function EventModal({ open, editingEvent, prefillDate, onSave, onDelete, onClose, saving }) {
  const [name, setName] = useState("")
  const [date, setDate] = useState("")
  const [desc, setDesc] = useState("")

  useEffect(() => {
    if (open) {
      setName(editingEvent?.name || "")
      setDate(editingEvent?.date || prefillDate || toYMD(new Date()))
      setDesc(editingEvent?.description || "")
    }
  }, [open, editingEvent, prefillDate])

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div style={S.modalOverlay}>
      <div style={S.modal}>
        <div style={S.modalTitle}>{editingEvent ? "Edit event" : "Add event"}</div>

        <div style={S.fg}>
          <label style={S.fLabel}>Event name</label>
          <input
            style={S.fInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Team meeting"
          />
        </div>
        <div style={S.fg}>
          <label style={S.fLabel}>Date</label>
          <input style={S.fInput} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div style={S.fg}>
          <label style={S.fLabel}>Description</label>
          <textarea
            style={{ ...S.fInput, height: 56, resize: "vertical" }}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Optional notes…"
          />
        </div>

        <div style={S.modalFooter}>
          {editingEvent && (
            <button style={S.mDel} disabled={saving} onClick={() => onDelete(editingEvent.id)}>
              Delete
            </button>
          )}
          <button style={S.mCancel} disabled={saving} onClick={onClose}>Cancel</button>
          <button
            style={{ ...S.mSave, opacity: saving ? 0.6 : 1 }}
            disabled={saving}
            onClick={() => {
              if (!name.trim() || !date) return
              onSave({ name: name.trim(), date, description: desc.trim() })
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Notification Sound ───────────────────────────────────────────────────────
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [
      { freq: 880, start: 0, duration: 0.18 },
      { freq: 1108.73, start: 0.14, duration: 0.28 },
    ]
    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      filter.type = "lowpass"
      filter.frequency.value = 4000
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    })
    setTimeout(() => ctx.close(), 600)
  } catch (e) { }
}

// ─── Notifications (top-right toast) ─────────────────────────────────────────
const TOAST_DURATION = 10000

function Toast({ ev, index, onDismiss }) {
  const isToday = ev.when === "today"
  const accent = isToday
    ? "#BA7517"                                   // amber for today
    : ev.type === "holiday" ? "#09ff00ff" : "#ff0000ff"  // red for tomorrow holiday, teal for tomorrow event

  return (
    <div style={{ ...S.toast, borderLeftColor: accent }}>
      <div style={S.toastBarTrack}>
        <div style={{ ...S.toastBar, background: accent, animationDuration: `${TOAST_DURATION}ms` }} />
      </div>
      <button style={S.notifX} onClick={() => onDismiss(index)}>×</button>
      <div style={S.notifHead}>
        🔔 {isToday ? "Today" : "Tomorrow"} — {ev.name}
      </div>
      <div style={S.notifSub}>
        {ev.type === "holiday" ? "Public holiday" : "Your event"}
        {ev.description ? ` · ${ev.description}` : ""}
      </div>
    </div>
  )
}

function Notifications({ items, onDismiss }) {
  if (!items.length) return null
  return (
    <div style={S.toastStack}>
      {items.map((ev, i) => (
        <Toast key={i} ev={ev} index={i} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

// ─── Detail Bar ───────────────────────────────────────────────────────────────
function DetailBar({ selectedYMD, hols, evs, onEdit, onDelete, onAddHere, onClose }) {
  if (!selectedYMD) return null
  const dt = new Date(selectedYMD + "T00:00:00")
  const label = dt.toLocaleDateString("en-PH", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })
  const all = [...hols, ...evs]

  return (
    <div style={S.detailBar}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 140 }}>
        <div style={S.detailDateMeta}>SELECTED DATE</div>
        <div style={S.detailDateLabel}>{label}</div>
      </div>
      <div style={S.detailEvents}>
        {all.map((ev, i) => (
          <div key={i} style={S.detailEv}>
            <span style={{ ...S.detailDot, background: ev.type === "holiday" ? "#BA7517" : "#1D9E75" }} />
            <span style={S.detailEvName}>{ev.name}</span>
            {ev.description && <span style={S.detailEvDesc}>· {ev.description}</span>}
            {ev.type === "user" && (
              <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                <button style={S.icBtn} onClick={() => onEdit(ev)}>✎</button>
                <button style={{ ...S.icBtn, color: "#A32D2D" }} onClick={() => onDelete(ev.id)}>🗑</button>
              </div>
            )}
          </div>
        ))}
        <button style={S.detailAdd} onClick={() => onAddHere(selectedYMD)}>
          + Add event on this day
        </button>
      </div>
      <button style={S.detailClose} onClick={onClose}>✕</button>
    </div>
  )
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────
function CalendarGrid({
  userEvents, viewYear, viewMonth, selectedYMD,
  onCellClick, onPrev, onNext, onToday, onAdd,
}) {
  const { hm, em } = buildMaps(userEvents)
  const todayYMD = toYMD(new Date())

  const first = new Date(viewYear, viewMonth, 1).getDay()
  const dim = new Date(viewYear, viewMonth + 1, 0).getDate()
  const prevDim = new Date(viewYear, viewMonth, 0).getDate()

  const cells = []
  for (let i = 0; i < first; i++) {
    const d = prevDim - first + 1 + i
    cells.push({ d, cur: false, ymd: toYMD(new Date(viewYear, viewMonth - 1, d)) })
  }
  for (let d = 1; d <= dim; d++) {
    cells.push({ d, cur: true, ymd: toYMD(new Date(viewYear, viewMonth, d)) })
  }
  const rem = (7 - (cells.length % 7)) % 7
  for (let i = 1; i <= rem; i++) {
    cells.push({ d: i, cur: false, ymd: toYMD(new Date(viewYear, viewMonth + 1, i)) })
  }

  const rows = []
  for (let r = 0; r < cells.length / 7; r++) rows.push(cells.slice(r * 7, r * 7 + 7))

  return (
    <div style={S.calShell}>
      <div style={S.calTop}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={S.calMonth}>{MONTHS_LONG[viewMonth]}</span>
          <span style={S.calYear}>{viewYear}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={S.todayBtn} onClick={onToday}>Today</button>
          <button style={S.navBtn} onClick={onPrev}>‹</button>
          <button style={S.navBtn} onClick={onNext}>›</button>
          <button style={S.addEvBtn} onClick={onAdd}>+ Add event</button>
        </div>
      </div>

      <div style={S.legend}>
        <div style={S.legItem}><span style={{ ...S.legDot, background: "#BA7517" }} />Public holiday</div>
        <div style={S.legItem}><span style={{ ...S.legDot, background: "#1D9E75" }} />Your event</div>
      </div>

      <div style={S.dayLabelsRow}>
        {DAYS_SHORT.map((d, i) => (
          <div key={d} style={{ ...S.dayLabel, color: i === 0 ? "#E24B4A" : "#6b7280" }}>{d}</div>
        ))}
      </div>

      <div style={{ borderTop: "0.5px solid #f0f0f0" }}>
        {rows.map((row, ri) => (
          <div key={ri} style={S.calRow}>
            {row.map((cell, ci) => {
              const hols = hm[cell.ymd] || []
              const evs = em[cell.ymd] || []
              const allEv = [...hols, ...evs]
              const isToday = cell.ymd === todayYMD
              const isSelected = cell.ymd === selectedYMD
              const isWeekend = ci === 0 || ci === 6
              const isHoliday = hols.length > 0 && cell.cur
              const isLast = ri === rows.length - 1

              return (
                <div
                  key={cell.ymd}
                  onClick={() => onCellClick(cell.ymd, hols, evs)}
                  style={{
                    ...S.calCell,
                    opacity: cell.cur ? 1 : 0.3,
                    background: isSelected ? "#E6F1FB"
                      : isHoliday ? "#FAEEDA"
                        : isWeekend && cell.cur ? "#FAFAFA"
                          : "white",
                    borderRight: ci === 6 ? "none" : "0.5px solid #f0f0f0",
                    borderBottom: isLast ? "none" : "0.5px solid #f0f0f0",
                    cursor: "pointer",
                  }}
                >
                  <div style={{
                    ...S.dnum,
                    background: isToday ? "#185FA5" : "transparent",
                    color: isToday ? "#fff"
                      : ci === 0 && cell.cur ? "#E24B4A"
                        : "#111",
                    fontWeight: isToday ? 500 : 400,
                  }}>
                    {cell.d}
                  </div>
                  <div style={S.cellPills}>
                    {allEv.slice(0, 2).map((ev, ei) => (
                      <div key={ei} style={ev.type === "holiday" ? S.pillHoliday : S.pillUser} title={ev.name}>
                        {ev.name}
                      </div>
                    ))}
                    {allEv.length > 2 && (
                      <div style={S.pillMore}>+{allEv.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const today = new Date()

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // ── User events — sourced from Supabase calendar_chart table
  const [userEvents, setUserEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // ── Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [prefillDate, setPrefillDate] = useState("")

  // ── Selection + notifications
  const [selectedYMD, setSelectedYMD] = useState(toYMD(new Date()))
  const [selectedHols, setSelectedHols] = useState([])
  const [notifs, setNotifs] = useState([])

  // ── Notes board — sourced from Supabase notes_board table
  const [notes, setNotes] = useState([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [noteSaving, setNoteSaving] = useState(false)

  // ── Delete confirmation (shared by events + notes)
  const [confirmTarget, setConfirmTarget] = useState(null) // { kind: "event" | "note", id }
  const [deleteBusy, setDeleteBusy] = useState(false)

  // ── Load user events from Supabase
  async function loadEvents() {
    setEventsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("calendar_chart")
        .select("id, name, date, description, type, created_at")
        .eq("type", "user")
        .order("date", { ascending: true })
      if (error) throw error
      setUserEvents(data || [])
    } catch (err) {
      console.error("Failed to load events:", err)
      setError("Could not load events.")
    } finally {
      setEventsLoading(false)
    }
  }

  useEffect(() => { loadEvents() }, [])

  // ── Load notes from Supabase
  async function loadNotes() {
    setNotesLoading(true)
    try {
      const { data, error } = await supabase
        .from("notes_board")
        .select("id, title, content, created_at")
        .order("created_at", { ascending: false })
      if (error) throw error
      setNotes(data || [])
    } catch (err) {
      console.error("Failed to load notes:", err)
      setError("Could not load notes.")
    } finally {
      setNotesLoading(false)
    }
  }

  useEffect(() => { loadNotes() }, [])

  async function handleSaveNote({ title, content }) {
    setNoteSaving(true)
    setError(null)
    try {
      if (editingNote) {
        const { error } = await supabase
          .from("notes_board")
          .update({ title, content })
          .eq("id", editingNote.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("notes_board")
          .insert({ title, content })
        if (error) throw error
      }
      await loadNotes()
      setNoteModalOpen(false)
      setEditingNote(null)
    } catch (err) {
      console.error("Save note failed:", err)
      setError("Could not save note. Please try again.")
    } finally {
      setNoteSaving(false)
    }
  }

  // Actually deletes a note — only ever called after confirmation
  async function deleteNote(id) {
    setError(null)
    try {
      const { error } = await supabase
        .from("notes_board")
        .delete()
        .eq("id", id)
      if (error) throw error
      await loadNotes()
    } catch (err) {
      console.error("Delete note failed:", err)
      setError("Could not delete note. Please try again.")
    }
  }

  // ── Refresh tomorrow + today notifications whenever events change
  useEffect(() => {
    const { hm, em } = buildMaps(userEvents)
    const tdy = toYMD(new Date())
    const tmr = toYMD(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))

    const todayEvs = [...(hm[tdy] || []), ...(em[tdy] || [])].map(e => ({ ...e, when: "today" }))
    const tmrEvs = [...(hm[tmr] || []), ...(em[tmr] || [])].map(e => ({ ...e, when: "tomorrow" }))
    const upcoming = [...todayEvs, ...tmrEvs]

    if (upcoming.length) playNotifSound()
    setNotifs(upcoming)
  }, [userEvents])

  // ── Auto-dismiss toasts
  useEffect(() => {
    if (!notifs.length) return
    const timer = setTimeout(() => setNotifs([]), TOAST_DURATION)
    return () => clearTimeout(timer)
  }, [notifs])

  // ── Navigation
  function handlePrev() {
    setViewMonth((m) => { if (m === 0) { setViewYear((y) => y - 1); return 11 } return m - 1 })
    setSelectedYMD(null)
  }
  function handleNext() {
    setViewMonth((m) => { if (m === 11) { setViewYear((y) => y + 1); return 0 } return m + 1 })
    setSelectedYMD(null)
  }
  function handleToday() {
    setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedYMD(null)
  }

  function handleCellClick(ymd, hols, evs) {
    setSelectedYMD(ymd); setSelectedHols(hols)
  }

  // ── Save (insert or update) to Supabase
  async function handleSave({ name, date, description }) {
    setSaving(true)
    setError(null)
    try {
      if (editingEvent) {
        const { error } = await supabase
          .from("calendar_chart")
          .update({ name, date, description })
          .eq("id", editingEvent.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("calendar_chart")
          .insert({ name, date, description, type: "user" })
        if (error) throw error
      }
      await loadEvents()
      setModalOpen(false)
      setEditingEvent(null)
      setSelectedYMD(date)
    } catch (err) {
      console.error("Save failed:", err)
      setError("Could not save event. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Actually deletes an event — only ever called after confirmation
  async function deleteEvent(id) {
    setError(null)
    try {
      const { error } = await supabase
        .from("calendar_chart")
        .delete()
        .eq("id", id)
      if (error) throw error
      await loadEvents()
      setSelectedYMD(null)
      setModalOpen(false)
      setEditingEvent(null)
    } catch (err) {
      console.error("Delete failed:", err)
      setError("Could not delete event. Please try again.")
    }
  }

  // ── Delete request handlers — open confirmation instead of deleting directly
  function requestDeleteEvent(id) {
    setConfirmTarget({ kind: "event", id })
  }
  function requestDeleteNote(id) {
    setConfirmTarget({ kind: "note", id })
  }
  async function handleConfirmDelete() {
    if (!confirmTarget) return
    setDeleteBusy(true)
    if (confirmTarget.kind === "event") {
      await deleteEvent(confirmTarget.id)
    } else {
      await deleteNote(confirmTarget.id)
    }
    setDeleteBusy(false)
    setConfirmTarget(null)
  }
  function handleCancelDelete() {
    if (deleteBusy) return
    setConfirmTarget(null)
  }

  const { em } = buildMaps(userEvents)
  const refreshedEvs = selectedYMD ? (em[selectedYMD] || []) : []

  return (
    <DashboardLayout>
      <style>{`
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        button:hover { opacity: 0.85; }
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes toastBarShrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      <NotesBoard
        notes={notes}
        loading={notesLoading}
        onAdd={() => { setEditingNote(null); setNoteModalOpen(true) }}
        onEdit={(n) => { setEditingNote(n); setNoteModalOpen(true) }}
        onDelete={requestDeleteNote}
      />

      {/* Inline error banner */}
      {error && (
        <div style={S.errorBanner}>
          ⚠ {error}
          <button style={S.errorDismiss} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Events loading indicator */}
      {eventsLoading && (
        <div style={S.loadingBar}>Loading events…</div>
      )}

      <Notifications
        items={notifs}
        onDismiss={(i) => setNotifs((n) => n.filter((_, idx) => idx !== i))}
      />

      <CalendarGrid
        userEvents={userEvents}
        viewYear={viewYear}
        viewMonth={viewMonth}
        selectedYMD={selectedYMD}
        onCellClick={handleCellClick}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onAdd={() => { setEditingEvent(null); setPrefillDate(""); setModalOpen(true) }}
      />

      {selectedYMD && (
        <DetailBar
          selectedYMD={selectedYMD}
          hols={selectedHols}
          evs={refreshedEvs}
          onEdit={(ev) => { setEditingEvent(ev); setModalOpen(true) }}
          onDelete={requestDeleteEvent}
          onAddHere={(ymd) => { setPrefillDate(ymd); setEditingEvent(null); setModalOpen(true) }}
          onClose={() => setSelectedYMD(null)}
        />
      )}

      <EventModal
        open={modalOpen}
        editingEvent={editingEvent}
        prefillDate={prefillDate}
        onSave={handleSave}
        onDelete={requestDeleteEvent}
        onClose={() => { setModalOpen(false); setEditingEvent(null) }}
        saving={saving}
      />

      <NoteModal
        open={noteModalOpen}
        editingNote={editingNote}
        onSave={handleSaveNote}
        onClose={() => { setNoteModalOpen(false); setEditingNote(null) }}
        saving={noteSaving}
      />

      <ConfirmModal
        open={!!confirmTarget}
        title={confirmTarget?.kind === "note" ? "Delete note?" : "Delete event?"}
        message={
          confirmTarget?.kind === "note"
            ? "This note will be permanently removed. This action cannot be undone."
            : "This event will be permanently removed. This action cannot be undone."
        }
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        busy={deleteBusy}
      />
    </DashboardLayout>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  notesShell: { marginBottom: 20 },
  notesTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  notesTitle: { fontSize: 16, fontWeight: 600, color: "#111" },
  addNoteBtn: {
    height: 30, padding: "0 14px", borderRadius: 8, border: "none",
    background: "#185FA5", cursor: "pointer", fontSize: 12, color: "#fff", fontWeight: 500,
  },
  notesEmpty: {
    fontSize: 12, color: "#9ca3af", padding: "20px 0", textAlign: "center",
    border: "1px dashed #e5e7eb", borderRadius: 12, background: "#fafafa",
  },
  notesScroll: {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    overflowY: "hidden",
    paddingBottom: 8,
  },
  noteCard: {
    flex: "0 0 180px", minHeight: 110, background: "#FFE066",
    borderRadius: 6, padding: "12px 12px 14px",
    boxShadow: "0 3px 8px rgba(0,0,0,0.12)",
    display: "flex", flexDirection: "column", gap: 6,
    transform: "rotate(-0.4deg)",
  },
  noteCardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 },
  noteCardTitle: { fontSize: 13, fontWeight: 700, color: "#3a2e00", lineHeight: 1.3, flex: 1 },
  noteCardContent: { fontSize: 12, color: "#5a4a00", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  noteIcBtn: {
    background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 4, cursor: "pointer",
    fontSize: 11, color: "#5a4a00", padding: "3px 6px", flexShrink: 0,
  },

  errorBanner: {
    background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: 8,
    padding: "10px 36px 10px 14px", fontSize: 12, color: "#791F1F",
    marginBottom: 12, position: "relative",
  },
  errorDismiss: {
    position: "absolute", top: 8, right: 10, background: "none",
    border: "none", cursor: "pointer", color: "#A32D2D", fontSize: 16,
  },
  loadingBar: {
    fontSize: 11, color: "#9ca3af", textAlign: "center",
    padding: "6px 0", marginBottom: 8,
  },

  toastStack: {
    position: "fixed", top: 16, right: 16, zIndex: 200,
    display: "flex", flexDirection: "column", gap: 8,
    maxWidth: 320, width: "100%", pointerEvents: "none",
  },
  toast: {
    borderRadius: "0 10px 10px 0", border: "0.5px solid #e5e7eb",
    borderLeft: "3px solid #BA7517", padding: "10px 36px 10px 14px",
    position: "relative", background: "white",
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
    animation: "toastSlideIn 0.25s ease", pointerEvents: "auto",
  },
  toastBarTrack: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: 3, background: "rgba(0,0,0,0.06)",
    borderRadius: "0 0 10px 0", overflow: "hidden",
  },
  toastBar: {
    height: "100%", width: "100%", borderRadius: "0 0 10px 0",
    animation: "toastBarShrink linear forwards", transformOrigin: "left",
  },
  notifHead: { fontSize: 12, fontWeight: 500, color: "#111", marginBottom: 2 },
  notifSub: { fontSize: 11, color: "#6b7280" },
  notifX: {
    position: "absolute", top: 8, right: 10, background: "none",
    border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16,
  },

  calShell: { background: "white", borderRadius: 12, border: "0.5px solid #e5e7eb", overflow: "hidden", marginBottom: 0 },
  calTop: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 12px" },
  calMonth: { fontSize: 18, fontWeight: 500, color: "#111" },
  calYear: { fontSize: 13, color: "#6b7280", fontWeight: 400 },
  todayBtn: {
    height: 28, padding: "0 12px", borderRadius: 8,
    border: "0.5px solid #e5e7eb", background: "none",
    cursor: "pointer", fontSize: 12, color: "#6b7280",
  },
  navBtn: {
    width: 28, height: 28, borderRadius: 8, border: "0.5px solid #e5e7eb",
    background: "none", cursor: "pointer", fontSize: 14, color: "#6b7280",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  addEvBtn: {
    height: 28, padding: "0 14px", borderRadius: 8, border: "none",
    background: "#185FA5", cursor: "pointer", fontSize: 12, color: "#fff", fontWeight: 500,
  },
  legend: { display: "flex", alignItems: "center", gap: 16, padding: "0 22px 12px" },
  legItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" },
  legDot: { width: 7, height: 7, borderRadius: "50%", display: "inline-block" },
  dayLabelsRow: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderTop: "0.5px solid #f0f0f0", borderBottom: "0.5px solid #f0f0f0" },
  dayLabel: { textAlign: "center", padding: "8px 0", fontSize: 11, fontWeight: 500, letterSpacing: "0.04em" },
  calRow: { display: "grid", gridTemplateColumns: "repeat(7,1fr)" },
  calCell: { minHeight: 64, padding: "6px 8px 4px", display: "flex", flexDirection: "column", gap: 2, transition: "background 0.12s" },
  dnum: { fontSize: 12, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0 },
  cellPills: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  pillHoliday: { fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "#FAEEDA", color: "#633806", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.5 },
  pillUser: { fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "#E1F5EE", color: "#085041", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.5 },
  pillMore: { fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "#f3f4f6", color: "#6b7280", lineHeight: 1.5 },

  detailBar: { background: "white", borderTop: "0.5px solid #e5e7eb", padding: "14px 22px", display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" },
  detailDateMeta: { fontSize: 10, color: "#9ca3af", letterSpacing: "0.05em", fontWeight: 500 },
  detailDateLabel: { fontSize: 13, fontWeight: 500, color: "#111", marginTop: 2 },
  detailEvents: { display: "flex", flexDirection: "column", gap: 5, flex: 1 },
  detailEv: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  detailDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  detailEvName: { color: "#111", flex: 1 },
  detailEvDesc: { fontSize: 12, color: "#6b7280" },
  icBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9ca3af", padding: "2px 5px", borderRadius: 4 },
  detailAdd: { background: "none", border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, color: "#6b7280", marginTop: 3, display: "flex", alignItems: "center", gap: 4 },
  detailClose: { background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af", padding: 2, alignSelf: "flex-start" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "white", borderRadius: 12, padding: 24, width: 340, maxWidth: "95vw", border: "0.5px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  modalTitle: { fontSize: 15, fontWeight: 500, color: "#111", marginBottom: 18 },
  confirmMsg: { fontSize: 13, color: "#4b5563", lineHeight: 1.5 },
  fg: { marginBottom: 14 },
  fLabel: { fontSize: 11, color: "#6b7280", display: "block", marginBottom: 5, letterSpacing: "0.03em" },
  fInput: { width: "100%", padding: "8px 10px", fontSize: 13, border: "0.5px solid #e5e7eb", borderRadius: 8, outline: "none", fontFamily: "inherit" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18, alignItems: "center" },
  mDel: { marginRight: "auto", background: "none", border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, color: "#A32D2D" },
  mDelSolid: { background: "#A32D2D", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 12, fontWeight: 500 },
  mCancel: { background: "none", border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, color: "#6b7280" },
  mSave: { background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 12, fontWeight: 500 },
}