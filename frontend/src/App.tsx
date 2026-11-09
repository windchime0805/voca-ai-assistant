import { useEffect, useRef, useState } from 'react'
import { AudioLines, ArrowRight, Bell, CalendarDays, Check, ChevronDown, CircleHelp, Command, Eye, EyeOff, Home, ListTodo, LockKeyhole, LogOut, Mail, Menu, Mic, Moon, MoreHorizontal, Plus, Search, Send, Settings, ShieldCheck, Sparkles, StickyNote, Sun, X } from 'lucide-react'

type Theme = 'day' | 'night'
type WakeRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type WakeRecognitionWindow = Window & { SpeechRecognition?: new () => WakeRecognition; webkitSpeechRecognition?: new () => WakeRecognition }
type Task = { id: string; title: string; description?: string | null; category: string; priority: string; status: 'pending' | 'completed'; due_date: string | null; due_time: string | null; notification_at: string | null; created_at: string; updated_at: string }
type LuuViNotification = { id: string; task_id: string; title: string; message: string; scheduled_for: string; created_at: string; read_at: string | null }

const navItems = [
  { label: 'Dashboard', icon: Home }, { label: 'AI Assistant', icon: Sparkles }, { label: 'My Tasks', icon: ListTodo },
  { label: 'Calendar', icon: CalendarDays }, { label: 'Reminders', icon: Bell }, { label: 'Notes', icon: StickyNote },
]
function BrandMark({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 160 140" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="luuvi-leaf-left" x1="30" y1="20" x2="84" y2="128" gradientUnits="userSpaceOnUse"><stop stopColor="#91C99A"/><stop offset="1" stopColor="#2F765E"/></linearGradient>
      <linearGradient id="luuvi-leaf-right" x1="111" y1="15" x2="87" y2="126" gradientUnits="userSpaceOnUse"><stop stopColor="#0B3D2E"/><stop offset="1" stopColor="#164F3D"/></linearGradient>
    </defs>
    <path d="M79 125C61 110 46 94 35 75C23 54 20 34 26 19C48 22 64 33 75 51C86 71 89 98 79 125Z" fill="url(#luuvi-leaf-left)"/>
    <path d="M78 126C81 98 87 69 100 44C110 25 126 16 143 17C146 38 139 62 126 83C113 104 96 119 78 126Z" fill="url(#luuvi-leaf-right)"/>
    <path d="M69 70V87M82 61V96M95 70V87" stroke="#F4FBF6" strokeWidth="5" strokeLinecap="round"/>
    <path d="M36 49C13 62 7 84 17 101C29 121 61 124 91 113C119 103 139 81 143 57C146 41 140 27 128 18" stroke="#164F3D" strokeWidth="3.5" strokeLinecap="round"/>
  </svg>
}
function localDayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function taskDueLabel(task: Task) {
  const dateLabel = !task.due_date ? 'No due date' : task.due_date === localDayKey() ? 'Today' : new Date(`${task.due_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (!task.due_time) return dateLabel
  const [hour, minute] = task.due_time.split(':').map(Number)
  return `${dateLabel} · ${new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
}

function categoryColor(category: string) {
  const colors: Record<string, string> = { work: 'blue', personal: 'violet', study: 'green', health: 'green' }
  return colors[category.toLowerCase()] || 'blue'
}

function localDateTimeIso(day: string, clock: string) {
  return new Date(`${day}T${clock}:00`).toISOString()
}

function reminderDate(value: string) {
  return new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`)
}

function parseSpokenTask(raw: string) {
  let title = raw.trim().replace(/^\s*(?:(?:please\s+)?(?:create|add|make)\s+(?:a\s+)?task(?:\s+(?:to|for)\s+|\s*[:,-]\s*|\s+))/i, '').replace(/^\s*(?:please\s+)?remind\s+me\s+(?:to|about)\s+/i, '').replace(/[.!?]+$/, '').trim()
  let dueDate = localDayKey()
  const tomorrow = title.match(/\b(tomorrow)\b/i)
  if (tomorrow) {
    const date = new Date(); date.setDate(date.getDate() + 1)
    dueDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    title = title.replace(tomorrow[0], '').trim()
  } else {
    const today = title.match(/\b(today)\b/i)
    if (today) title = title.replace(today[0], '').trim()
  }

  const relativeTime = title.match(/\b(?:in|after)\s+(\d{1,3})\s*(minutes?|mins?|hours?|hrs?)\b/i)
  if (relativeTime) {
    const amount = Number(relativeTime[1])
    const target = new Date(Date.now() + amount * (/^h/i.test(relativeTime[2]) ? 60 * 60_000 : 60_000))
    const targetDay = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
    const targetTime = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}:00`
    const taskTitle = title.replace(relativeTime[0], '').replace(/\s+/g, ' ').trim() || 'Reminder'
    return { title: taskTitle, due_date: targetDay, due_time: targetTime, notification_at: localDateTimeIso(targetDay, targetTime.slice(0, 5)) }
  }

  const numberWords: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12' }
  title = title.replace(/\b(at|by)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s+o['’]?clock)?(?:\s+(am|pm))?\b/gi, (_match, connector: string, spokenHour: string, period?: string) => `${connector} ${numberWords[spokenHour.toLowerCase()]}${period ? ` ${period}` : ''}`)

  let timeMatch = title.match(/\b(?:at|by)\s+(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?\b/i)
  let hourText: string | undefined = timeMatch?.[1]
  let minuteText: string | undefined = timeMatch?.[2]
  let period: string | undefined = timeMatch?.[3]?.toLowerCase()
  if (!timeMatch) {
    timeMatch = title.match(/\b(\d{1,2}):([0-5]\d)\b/)
    hourText = timeMatch?.[1]; minuteText = timeMatch?.[2]
  }
  if (!timeMatch) {
    timeMatch = title.match(/(\d{1,2})(?::([0-5]\d))?\s*(am|pm|a\.m\.|p\.m\.|बजे|மணிக்கு|గంటలకు|ಗಂಟೆಗೆ|മണിക്ക്|वाजता|વાગ્યે|টায়|বেজে|ਵਜੇ)/iu)
    hourText = timeMatch?.[1]; minuteText = timeMatch?.[2]
    period = timeMatch?.[3]?.toLowerCase()
  }
  const nativeClock = title.match(/(\d{1,2})(?::([0-5]\d))?\s*(?:बजे|மணிக்கு|గంటలకు|గంటలకు|ಗಂಟೆಗೆ|മണിക്ക്|वाजता|વાગ્યે|টায়|বেজে|ਵਜੇ)/iu)
  if (nativeClock) { timeMatch = nativeClock; hourText = nativeClock[1]; minuteText = nativeClock[2]; period = undefined }

  let dueTime: string | null = null
  if (timeMatch && hourText) {
    let hour = Number(hourText)
    const minute = Number(minuteText || '0')
    const dayPart = title.match(/(?:morning|afternoon|evening|night|सुबह|दोपहर|शाम|रात|காலை|மாலை|ఉదయం|సాయంత్రం|ರಾತ್ರಿ|ಬೆಳಿಗ್ಗೆ|രാവിലെ|വൈകുന്നേരം|सकाळी|संध्याकाळी|સવારે|સાંજે|সকাল|রাত|ਸਵੇਰੇ|ਸ਼ਾਮ)/iu)?.[0]?.toLowerCase()
    if (period === 'pm' || period === 'p.m.' || ['afternoon','evening','night','दोपहर','शाम','रात','மாலை','సాయంత్రం','ರಾತ್ರಿ','വൈകുന്നേരം','संध्याकाळी','સાંજે','রাত','ਸ਼ਾਮ'].includes(dayPart || '')) { if (hour < 12) hour += 12 }
    else if (period === 'am' || period === 'a.m.' || ['morning','सुबह','காலை','ఉదయం','ಬೆಳಿಗ್ಗೆ','രാവിലെ','सकाळी','સવારે','সকাল','ਸਵੇਰੇ'].includes(dayPart || '')) { if (hour === 12) hour = 0 }
    const unqualifiedAtTime = !period && !timeMatch[0].includes(':') && hour >= 1 && hour <= 12 && /^\s*(?:at|by)\s/i.test(timeMatch[0])
    const isUnambiguous = Boolean(period || dayPart || timeMatch[0].includes(':') || hour > 12 || unqualifiedAtTime)
    if (hour >= 0 && hour <= 23 && minute <= 59 && isUnambiguous) {
      if (unqualifiedAtTime) {
        const now = new Date()
        if (dueDate === localDayKey()) {
          const candidates = [hour % 12, hour % 12 + 12].map(candidateHour => {
            const candidate = new Date(`${dueDate}T00:00:00`)
            candidate.setHours(candidateHour, minute, 0, 0)
            return candidate
          }).filter(candidate => candidate.getTime() > now.getTime()).sort((a, b) => a.getTime() - b.getTime())
          if (candidates.length) {
            hour = candidates[0].getHours()
            dueDate = `${candidates[0].getFullYear()}-${String(candidates[0].getMonth() + 1).padStart(2, '0')}-${String(candidates[0].getDate()).padStart(2, '0')}`
          } else {
            const nextDay = new Date(`${dueDate}T00:00:00`)
            nextDay.setDate(nextDay.getDate() + 1)
            dueDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`
            hour %= 12
          }
        } else hour = hour === 12 ? 12 : hour + 12
      }
      dueTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
      if (!unqualifiedAtTime && dueDate === localDayKey() && new Date(`${dueDate}T${dueTime}`).getTime() <= Date.now()) {
        const nextDay = new Date(`${dueDate}T00:00:00`)
        nextDay.setDate(nextDay.getDate() + 1)
        dueDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`
      }
      title = title.replace(timeMatch[0], '').trim()
      if (dayPart) title = title.replace(new RegExp(dayPart, 'iu'), '').trim()
    }
  }
  return { title: title.replace(/\s+/g, ' ').replace(/[.!?]+$/, '') || (dueTime ? 'Reminder' : ''), due_date: dueDate, due_time: dueTime, notification_at: dueTime ? localDateTimeIso(dueDate, dueTime.slice(0, 5)) : null }
}

function makeWav(samples: Float32Array[], sampleRate: number) {
  const joined = new Float32Array(samples.reduce((total, part) => total + part.length, 0))
  let offset = 0
  samples.forEach(part => { joined.set(part, offset); offset += part.length })
  const ratio = sampleRate / 16000
  const length = Math.floor(joined.length / ratio)
  const pcm = new Int16Array(length)
  for (let i = 0; i < length; i++) {
    const sample = joined[Math.floor(i * ratio)] || 0
    pcm[i] = Math.max(-1, Math.min(1, sample)) * (sample < 0 ? 32768 : 32767)
  }
  const buffer = new ArrayBuffer(44 + pcm.length * 2)
  const view = new DataView(buffer)
  const writeText = (position: number, text: string) => [...text].forEach((char, index) => view.setUint8(position + index, char.charCodeAt(0)))
  writeText(0, 'RIFF'); view.setUint32(4, 36 + pcm.length * 2, true); writeText(8, 'WAVE')
  writeText(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  writeText(36, 'data'); view.setUint32(40, pcm.length * 2, true)
  new Uint8Array(buffer, 44).set(new Uint8Array(pcm.buffer))
  return new Blob([buffer], { type: 'audio/wav' })
}

export default function App() {
  const [view, setView] = useState<'login' | 'workspace'>(() => (localStorage.getItem('luuvi-demo-session') ?? localStorage.getItem('voca-demo-session')) === 'active' ? 'workspace' : 'login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')
  const [active, setActive] = useState('Dashboard')
  const [prompt, setPrompt] = useState('')
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('luuvi-theme') ?? localStorage.getItem('voca-theme')
    return savedTheme === 'day' || savedTheme === 'night' ? savedTheme : 'night'
  })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState(localDayKey())
  const [notes, setNotes] = useState(() => localStorage.getItem('luuvi-notes') || '')
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskCategory, setTaskCategory] = useState('Personal')
  const [taskPriority, setTaskPriority] = useState('Medium')
  const [taskDueDate, setTaskDueDate] = useState(localDayKey())
  const [taskDueTime, setTaskDueTime] = useState('')
  const [taskNotifyEnabled, setTaskNotifyEnabled] = useState(false)
  const [taskNotificationTime, setTaskNotificationTime] = useState('')
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing'>('idle')
  const [, setWakeWordEnabled] = useState(false)
  const [voiceTaskToUndo, setVoiceTaskToUndo] = useState<Task | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [notifications, setNotifications] = useState<LuuViNotification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const seenNotifications = useRef(new Set<string>())
  const stopRecordingRef = useRef<(() => void) | null>(null)
  const cancelRecordingRef = useRef<(() => void) | null>(null)
  const wakeRecognitionRef = useRef<WakeRecognition | null>(null)
  const wakeWordEnabledRef = useRef(false)
  const voiceCaptureRef = useRef(false)

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('luuvi-theme', theme); localStorage.removeItem('voca-theme') }, [theme])
  useEffect(() => { localStorage.setItem('luuvi-notes', notes) }, [notes])
  useEffect(() => () => { wakeWordEnabledRef.current = false; wakeRecognitionRef.current?.stop(); cancelRecordingRef.current?.() }, [])

  useEffect(() => {
    fetch('/api/tasks').then(async response => {
      if (!response.ok) throw new Error('Could not load tasks')
      setTasks(await response.json() as Task[])
    }).catch(() => setNotice('Tasks could not load. Check that LuuVi’s backend is running.'))
      .finally(() => setTasksLoading(false))
  }, [])

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await fetch('/api/notifications?unread_only=true')
        if (!response.ok) return
        const fresh = await response.json() as LuuViNotification[]
        setNotifications(fresh)
        for (const item of fresh) {
          if (seenNotifications.current.has(item.id)) continue
          seenNotifications.current.add(item.id)
          if ('Notification' in window && Notification.permission === 'granted') {
            try { new Notification(item.title, { body: item.message, silent: true, tag: item.id }) } catch { /* In-app notice remains available. */ }
          }
        }
      } catch { /* Continue without browser notifications if polling is unavailable. */ }
    }
    void loadNotifications()
    const timer = window.setInterval(() => { void loadNotifications() }, 10000)
    return () => window.clearInterval(timer)
  }, [])

  const todayKey = localDayKey()
  const upcomingAlerts = tasks
    .filter(task => task.status === 'pending' && task.notification_at && reminderDate(task.notification_at).getTime() > Date.now())
    .sort((a, b) => reminderDate(a.notification_at!).getTime() - reminderDate(b.notification_at!).getTime())
    .slice(0, 8)
  const todayTasks = tasks.filter(task => task.due_date === todayKey || (!task.due_date && new Date(task.created_at).toLocaleDateString('en-CA') === todayKey))
  const todayCompleted = todayTasks.filter(task => task.status === 'completed').length
  const todayPercent = todayTasks.length ? Math.round((todayCompleted / todayTasks.length) * 100) : 0
  const dailyTasks = tasks.filter(task => task.due_date === selectedDay || (!task.due_date && new Date(task.created_at).toLocaleDateString('en-CA') === selectedDay))
  const notebookTasks = [...dailyTasks].sort((a, b) => (a.due_time || '99:99').localeCompare(b.due_time || '99:99'))
  const dailyCompleted = dailyTasks.filter(task => task.status === 'completed').length
  const percent = dailyTasks.length ? Math.round((dailyCompleted / dailyTasks.length) * 100) : 0
  const appreciation = percent === 100
    ? 'You showed up for every goal today. Beautiful work.'
    : percent >= 67 ? 'Look at you go. You’re building a lovely rhythm.'
      : percent > 0 ? 'Every small win counts. Keep your gentle momentum.'
        : 'A fresh day is full of possibility. Start with one small win.'
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const tomorrowKey = (() => { const date = new Date(); date.setDate(date.getDate() + 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` })()
  const selectedDayLabel = selectedDay === todayKey ? 'Today' : selectedDay === tomorrowKey ? 'Tomorrow' : new Date(`${selectedDay}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const navigate = (label: string) => {
    setActive(label)
    setMenuOpen(false)
    if (label === 'Reminders') {
      setNotificationsOpen(true)
      return
    }
    setNotificationsOpen(false)
    if (label === 'Settings') {
      document.querySelector('.theme-switch')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const target: Record<string, string> = { Dashboard: 'dashboard-top', 'AI Assistant': 'assistant-section', 'My Tasks': 'tasks-section', Calendar: 'calendar-section', Notes: 'notes-section' }
    document.getElementById(target[label] || 'dashboard-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const enterDemo = () => { localStorage.setItem('luuvi-demo-session', 'active'); localStorage.removeItem('voca-demo-session'); setLoginMessage(''); setView('workspace') }
  const signOutDemo = () => { localStorage.removeItem('luuvi-demo-session'); localStorage.removeItem('voca-demo-session'); setProfileMenuOpen(false); setView('login') }
  const submitLogin = (event: React.FormEvent) => {
    event.preventDefault()
    setLoginMessage('Account authentication is not configured in this local build. Use the demo workspace below to continue.')
  }

  useEffect(() => {
    if (view !== 'workspace' || tasksLoading || !todayTasks.length || todayPercent !== 100) return
    setCelebrate(true)
    const timer = window.setTimeout(() => setCelebrate(false), 6500)
    return () => window.clearTimeout(timer)
  }, [view, tasksLoading, todayTasks.length, todayPercent, todayKey])

  const toggleTask = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed'
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) })
      if (!response.ok) throw new Error('Could not update that task.')
      const updated = await response.json() as Task
      setTasks(current => current.map(item => item.id === updated.id ? updated : item))
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not update that task.') }
  }

  const createTask = async (title: string, options: { category?: string; priority?: string; due_date?: string | null; due_time?: string | null; notification_at?: string | null } = {}): Promise<Task> => {
    const response = await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category: options.category || 'Personal', priority: options.priority || 'Medium', due_date: options.due_date === undefined ? todayKey : options.due_date, due_time: options.due_time ?? null, notification_at: options.notification_at ?? null }),
    })
    const result = await response.json() as Task | { detail?: string }
    if (!response.ok || !('id' in result)) throw new Error('detail' in result ? result.detail : 'Task could not be saved.')
    setTasks(current => [result, ...current])
    setSelectedDay(options.due_date || localDayKey())
    setNotice(options.notification_at ? `“${result.title}” is saved. A reminder is set for ${reminderDate(options.notification_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.` : `“${result.title}” is saved to your tasks.`)
    setPrompt('')
    setTaskTitle('')
    setVoiceTaskToUndo(null)
    setTaskDialogOpen(false)
    return result
  }

  const saveTaskFromDialog = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!taskTitle.trim()) return
    if (taskNotifyEnabled && (!taskDueDate || !taskNotificationTime)) { setNotice('Choose the day and notification time first.'); return }
    try {
      const notification_at = taskNotifyEnabled ? localDateTimeIso(taskDueDate, taskNotificationTime) : null
      await createTask(taskTitle.trim(), { category: taskCategory, priority: taskPriority, due_date: taskDueDate || null, due_time: taskDueTime || null, notification_at })
      setNotice(taskNotifyEnabled ? 'Task saved. Its notification will be silent.' : 'Task saved to your LuuVi workspace.')
      setTaskDueTime('')
      setTaskNotifyEnabled(false)
      setTaskNotificationTime('')
    }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Task could not be saved.') }
  }

  const requestBrowserNotifications = async () => {
    if (!('Notification' in window)) { setNotice('This browser does not support system notifications. In-app reminders will still appear while LuuVi is open.'); return }
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      setNotice(permission === 'granted' ? 'Quiet notifications are enabled.' : 'Browser notifications were declined. In-app reminders will still appear while LuuVi is open.')
    } else if (Notification.permission === 'denied') setNotice('Browser notifications are blocked. In-app reminders will still appear while LuuVi is open.')
    else setNotice('Quiet notifications are enabled.')
  }

  const cancelVoiceAction = async () => {
    if (voiceState === 'listening' || voiceState === 'processing') {
      cancelRecordingRef.current?.()
      return
    }
    if (!voiceTaskToUndo) return
    try {
      const response = await fetch(`/api/tasks/${voiceTaskToUndo.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error()
      setTasks(current => current.filter(task => task.id !== voiceTaskToUndo.id))
      setVoiceTaskToUndo(null)
      setPrompt('')
      setNotice('Voice task cancelled and removed from today.')
    } catch { setNotice('Could not cancel the saved task. Try deleting it from the task list.') }
  }

  const markNotificationRead = async (notification: LuuViNotification) => {
    try {
      const response = await fetch(`/api/notifications/${notification.id}/read`, { method: 'PUT' })
      if (response.ok) setNotifications(current => current.filter(item => item.id !== notification.id))
    } catch { /* Leave the notification visible so it can be retried. */ }
  }

  const stopVoiceCapture = async () => {
    setVoiceState('processing')
    setNotice('Listening to your recording…')
    const stop = stopRecordingRef.current
    if (stop) stop()
  }

  const startVoiceCapture = async () => {
    setNotice('')
    voiceCaptureRef.current = true
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      voiceCaptureRef.current = false
      setNotice('Microphone recording is unavailable in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
      const context = new AudioContext()
      const source = context.createMediaStreamSource(stream)
      const processor = context.createScriptProcessor(4096, 1, 1)
      const mute = context.createGain()
      mute.gain.value = 0
      const chunks: Float32Array[] = []
      let finished = false
      processor.onaudioprocess = event => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)))
      source.connect(processor); processor.connect(mute); mute.connect(context.destination)
      setVoiceState('listening')
      setNotice('Listening… speak naturally, then tap the microphone again.')
      const finish = async () => {
        if (finished) return
        finished = true
        setVoiceState('processing')
        setNotice('Listening to your recording…')
        processor.onaudioprocess = null
        try { source.disconnect(); processor.disconnect(); mute.disconnect() } catch { /* Already disconnected. */ }
        stream.getTracks().forEach(track => track.stop())
        const rate = context.sampleRate
        await context.close()
        stopRecordingRef.current = null
        cancelRecordingRef.current = null
        if (!chunks.length) {
          voiceCaptureRef.current = false
          setVoiceState('idle'); setNotice('I did not catch any audio. Please try again.')
          if (wakeWordEnabledRef.current) window.setTimeout(() => startWakeWordListening(), 500)
          return
        }
        try {
          const form = new FormData()
          form.append('audio_file', makeWav(chunks, rate), 'luuvi-recording.wav')
          form.append('language_code', 'en-IN')
          const controller = new AbortController()
          cancelRecordingRef.current = () => {
            controller.abort()
            setVoiceState('idle')
            setNotice('Voice input cancelled. Nothing was saved.')
          }
          const response = await fetch('/api/voice/transcribe', { method: 'POST', body: form, signal: controller.signal })
          const result = await response.json() as { transcript?: string; detail?: string; detected_language_code?: string }
          if (!response.ok) throw new Error(result.detail || 'Speech recognition could not process that recording.')
          const transcript = result.transcript?.trim()
          if (!transcript) { setNotice('I couldn’t make out any words. Try speaking a little closer to the microphone.'); return }
          setPrompt(transcript)
          const parsedTask = parseSpokenTask(transcript)
          const taskTitle = parsedTask.title
          if (!taskTitle) { setNotice('I heard a task command but missed the task name. Please try again.'); return }
          const created = await createTask(taskTitle, { due_date: parsedTask.due_date, due_time: parsedTask.due_time, notification_at: parsedTask.notification_at })
          setVoiceTaskToUndo(created)
          setNotice(`${parsedTask.notification_at ? 'Task saved. Silent notification set' : 'Added to today’s tasks'}${result.detected_language_code ? ` · Prisma heard ${result.detected_language_code}` : ''}: “${taskTitle}”`)
          window.requestAnimationFrame(() => document.getElementById('tasks-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
        } catch (error) {
          if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice(error instanceof Error ? error.message : 'Prisma could not transcribe this recording. Tap the microphone to try again.')
        } finally {
          voiceCaptureRef.current = false
          setVoiceState('idle')
          cancelRecordingRef.current = null
          if (wakeWordEnabledRef.current) window.setTimeout(() => startWakeWordListening(), 500)
        }
      }
      stopRecordingRef.current = () => { void finish() }
      cancelRecordingRef.current = () => {
        if (finished) return
        finished = true
        processor.onaudioprocess = null
        try { source.disconnect(); processor.disconnect(); mute.disconnect() } catch { /* Already disconnected. */ }
        stream.getTracks().forEach(track => track.stop())
        void context.close()
        stopRecordingRef.current = null
        cancelRecordingRef.current = null
        setVoiceState('idle')
        voiceCaptureRef.current = false
        setNotice('Recording cancelled. Nothing was added.')
        if (wakeWordEnabledRef.current) window.setTimeout(() => startWakeWordListening(), 500)
      }
      window.setTimeout(() => { if (!finished) void finish() }, 25000)
    } catch (error) {
      voiceCaptureRef.current = false
      setVoiceState('idle')
      setNotice(error instanceof Error && error.name === 'NotAllowedError' ? 'Microphone access was denied. Allow access to use voice tasks.' : 'Could not open the microphone. Check that it is connected and try again.')
      if (wakeWordEnabledRef.current) window.setTimeout(() => startWakeWordListening(), 700)
    }
  }

  const startWakeWordListening = () => {
    if (!wakeWordEnabledRef.current || voiceCaptureRef.current) return
    const recognitionWindow = window as WakeRecognitionWindow
    const Recognition = recognitionWindow.SpeechRecognition || recognitionWindow.webkitSpeechRecognition
    if (!Recognition) {
      wakeWordEnabledRef.current = false
      setWakeWordEnabled(false)
      setNotice('Wake-word detection is unavailable in this browser. Tap the microphone again to record directly.')
      return
    }
    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'
    recognition.onresult = event => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const transcript = event.results[index][0]?.transcript || ''
        if (!/\b(luu\s*vi|luvi|loo\s*vee)\b/i.test(transcript)) continue
        voiceCaptureRef.current = true
        recognition.stop()
        wakeRecognitionRef.current = null
        setNotice('LuuVi heard you. Speak your task now.')
        window.setTimeout(() => void startVoiceCapture(), 350)
        return
      }
    }
    recognition.onerror = event => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      wakeWordEnabledRef.current = false
      setWakeWordEnabled(false)
      wakeRecognitionRef.current = null
      setNotice(event.error === 'not-allowed' ? 'Microphone access was denied. Allow it to enable the LuuVi wake word.' : 'Wake-word listening stopped. Tap the microphone to try again.')
    }
    recognition.onend = () => {
      if (wakeRecognitionRef.current === recognition) wakeRecognitionRef.current = null
      if (wakeWordEnabledRef.current && !voiceCaptureRef.current) window.setTimeout(() => startWakeWordListening(), 350)
    }
    wakeRecognitionRef.current = recognition
    try { recognition.start() } catch {
      wakeWordEnabledRef.current = false
      setWakeWordEnabled(false)
      wakeRecognitionRef.current = null
      setNotice('Could not start wake-word listening. Check microphone permissions and try again.')
    }
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const text = prompt.trim()
    const intent = text.match(/^(?:please\s+)?(?:create|add|make)\s+(?:a\s+)?task(?:\s+(?:to|for)\s+|\s*[:,-]\s*|\s+)(.+)$/i)
    const parsed = parseSpokenTask(text)
    if (intent || parsed.notification_at) {
      if (!parsed.title) { setNotice('Tell me what the task is, for example “Create a task to review my notes”.'); return }
      void createTask(parsed.title, { due_date: parsed.due_date, due_time: parsed.due_time, notification_at: parsed.notification_at }).catch(error => setNotice(error instanceof Error ? error.message : 'Task could not be saved.'))
      return
    }
    if (text) setNotice('Try “Create a task to finish my assignment tomorrow” or use Add a task. Other assistant actions are not connected yet.')
  }

  if (view === 'login') return <main className="login-screen">
    <section className="login-story"><div className="login-brand"><span className="brand-mark"><BrandMark size={27}/></span><span>LuuVi</span></div><div className="login-story-copy"><div className="login-kicker"><Sparkles size={13}/> PRODUCTIVITY, WITH ROOM TO BREATHE</div><h1>A little more calm.<br/><em>A lot more you.</em></h1><p>Bring your tasks, thoughts, and plans into one gentle rhythm. LuuVi helps you make progress without the pressure.</p><div className="login-orbit" aria-hidden="true"><div className="login-orbit-ring ring-a"/><div className="login-orbit-ring ring-b"/><div className="login-orbit-core"><AudioLines size={34}/></div><span className="login-star star-a">✦</span><span className="login-star star-b">✧</span><span className="login-star star-c">✦</span></div><div className="login-mantra"><span className="mantra-mark">“</span><span>One thoughtful step at a time.<small>Your space to focus, reset, and begin again.</small></span></div></div><div className="login-story-footer"><span><ShieldCheck size={14}/> Your workspace runs locally</span><span>Made for your everyday <b>✳</b></span></div></section>
    <section className="login-side"><div className="login-panel"><div className="login-panel-heading"><span className="login-kicker">WELCOME BACK</span><h2>Come on in.</h2><p>Sign in to settle into your workspace.</p></div><form className="login-form" onSubmit={submitLogin}><label>Email address<span className="login-input-wrap"><Mail size={16}/><input type="email" autoComplete="username" placeholder="you@example.com" required value={loginEmail} onChange={event => setLoginEmail(event.target.value)}/></span></label><label>Password<span className="login-input-wrap"><LockKeyhole size={16}/><input type={showLoginPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required value={loginPassword} onChange={event => setLoginPassword(event.target.value)}/><button type="button" onClick={() => setShowLoginPassword(value => !value)} aria-label={showLoginPassword ? 'Hide password' : 'Show password'}>{showLoginPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span></label><button className="login-submit" type="submit">Sign in <ArrowRight size={16}/></button>{loginMessage && <p className="login-message" role="status">{loginMessage}</p>}</form><div className="login-divider"><span/>OR<span/></div><button className="demo-login" onClick={enterDemo}>Continue to local demo <ArrowRight size={15}/></button><p className="login-setup-note">Account sign-in isn’t connected yet. Your existing local tasks are available in demo mode.</p></div><div className="login-side-footer">A softer start to a more focused day.</div></section>
  </main>

  return <div className={`app-shell theme-${theme}`}>
    {celebrate && <div className="golden-poppers" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 12) * 110}ms`, transform: `rotate(${index * 43}deg)` }}/>)}</div>}
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><BrandMark size={25}/></div><span>LuuVi</span><button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE <ChevronDown size={13}/></div>
      <nav aria-label="Main navigation">{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${active === label ? 'selected' : ''}`} onClick={() => navigate(label)}><Icon size={18}/><span>{label}</span>{label === 'Reminders' && <i className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={16}/></div><strong>Make room for focus</strong><p>Small, thoughtful progress is still progress.</p><button onClick={() => navigate('AI Assistant')}>Meet your assistant <span>↗</span></button></div><button className={`nav-item ${active === 'Settings' ? 'selected' : ''}`} onClick={() => navigate('Settings')}><Settings size={18}/><span>Settings</span></button><div className="profile-menu-wrap"><button className="profile" aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen(open => !open)}><div className="avatar">JD</div><span><strong>Jordan Davis</strong><small>Personal workspace</small></span><MoreHorizontal size={18}/></button>{profileMenuOpen && <div className="profile-menu" role="menu"><div className="profile-menu-heading"><strong>Jordan Davis</strong><span>Personal workspace</span></div><button role="menuitem" onClick={signOutDemo}><LogOut size={15}/> Sign out</button></div>}</div></div>
    </aside>
    {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close menu"/>}
    <main className="main-content"><header className="topbar"><button className="icon-button menu-trigger" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20}/></button><div className="breadcrumb"><span>Workspace</span><span className="slash">/</span><strong>{active}</strong></div><div className="top-actions"><button className="search-button"><Search size={16}/><span>Search anything</span><kbd>⌘ K</kbd></button><div className="theme-switch" role="group" aria-label="Appearance"><button className={theme === 'day' ? 'active' : ''} onClick={() => setTheme('day')} aria-label="Day mode" title="Day mode"><Sun size={15}/></button><button className={theme === 'night' ? 'active' : ''} onClick={() => setTheme('night')} aria-label="Night mode" title="Night mode"><Moon size={15}/></button></div><button className="icon-button help-button" aria-label="Help"><CircleHelp size={19}/></button><button className="icon-button notification-button" onClick={() => setNotificationsOpen(open => !open)} aria-label={`Notifications, ${notifications.length} unread`} title="Quiet notifications"><Bell size={19}/>{notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}</button><div className="avatar small">JD</div></div></header>
      {notificationsOpen && <aside className="notification-popover" aria-label="Notifications"><div className="notification-popover-head"><div><strong>Quiet reminders</strong><span>Sound is off by default</span></div><button className="text-button" onClick={() => void requestBrowserNotifications()}>{'Notification' in window && Notification.permission === 'granted' ? 'Enabled' : 'Enable alerts'}</button></div>{notifications.length === 0 && upcomingAlerts.length === 0 && <p className="notification-empty">No new reminders. You can keep your day moving gently.</p>}{notifications.map(item => <button className="notification-item" key={item.id} onClick={() => void markNotificationRead(item)}><span className="notification-mark"><Bell size={14}/></span><span><strong>{item.title}</strong><small>{item.message} · {new Date(`${item.scheduled_for}Z`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></span><i/></button>)}{upcomingAlerts.length > 0 && <section className="upcoming-alerts"><div className="notification-section-title">UPCOMING ALERTS <span>{upcomingAlerts.length}</span></div>{upcomingAlerts.map(task => <button className="notification-item upcoming-alert" key={task.id} onClick={() => { setSelectedDay(task.due_date || localDayKey()); navigate('My Tasks') }}><span className="notification-mark upcoming-mark"><CalendarDays size={14}/></span><span><strong>{task.title}</strong><small>{reminderDate(task.notification_at!).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></span></button>)}</section>}<p className="notification-foot">LuuVi notifications are silent. Your device’s silent mode is respected.</p></aside>}
      <div className="page-wrap" id="dashboard-top"><section className="welcome-row"><div><div className="eyebrow"><Sun size={14}/> {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</div><h1>{greeting}, Jordan <span className="wave">✦</span></h1><p>Here’s what’s happening with your day.</p></div><div className="calendar-picker"><button className="date-button" aria-expanded={calendarOpen} aria-haspopup="true" onClick={() => setCalendarOpen(open => !open)}><CalendarDays size={16}/> {selectedDayLabel} <ChevronDown size={14}/></button>{calendarOpen && <div className="calendar-menu" role="menu"><button role="menuitem" onClick={() => { setSelectedDay(todayKey); setCalendarOpen(false) }}>Today</button><button role="menuitem" onClick={() => { setSelectedDay(tomorrowKey); setCalendarOpen(false) }}>Tomorrow</button><label>Choose a date<input type="date" value={selectedDay} onChange={event => { if (event.target.value) { setSelectedDay(event.target.value); setCalendarOpen(false) } }}/></label></div>}</div></section>
      <section className="hero-card" id="assistant-section">
        <div className="hero-copy">
          <div className="assistant-label"><span className={`status-pulse ${voiceState === 'listening' ? 'is-listening' : ''}`}/>{voiceState === 'listening' ? 'I’M LISTENING' : voiceState === 'processing' ? 'TRANSCRIBING WITH PRISMA' : 'YOUR PERSONAL ASSISTANT'}</div>
          <h2>What’s on your mind?</h2>
          <p>Type a task below, or use the microphone to speak.</p>
          <form className="prompt-box" onSubmit={submit}>
            <input aria-label="Type a task command" placeholder="Try “Create a task to review my notes”" value={prompt} onChange={e => setPrompt(e.target.value)}/>
            <div className="prompt-actions">{(voiceState !== 'idle' || voiceTaskToUndo !== null) && <button type="button" className="cancel-recording prompt-cancel" onClick={() => void cancelVoiceAction()} aria-label="Cancel voice task" title="Cancel recording or undo this voice task"><X size={15}/></button>}<button type="button" className={`mic-button ${voiceState === 'listening' ? 'recording' : ''}`} onClick={voiceState === 'listening' ? stopVoiceCapture : () => void startVoiceCapture()} aria-label={voiceState === 'listening' ? 'Stop and add task' : 'Speak a task'} disabled={voiceState === 'processing'}>{voiceState === 'listening' ? <span className="recording-stop"/> : <Mic size={17}/>}</button><button className="send-button" aria-label="Add task"><Send size={16}/></button></div>
          </form>
          {voiceState === 'listening' && <div className="frequency-visualizer" role="img" aria-label="Voice input waveform"><span className="visualizer-live"><i/> LIVE</span><div className="frequency-bars" aria-hidden="true">{Array.from({ length: 31 }, (_, index) => <i key={index} style={{ animationDelay: `${(index % 9) * -0.11}s` }}/>)}</div><span className="visualizer-caption">Listening to your voice</span></div>}
          {notice && <div className={`inline-notice ${voiceState !== 'idle' ? 'voice-notice' : ''}`} role="status">{notice}</div>}
          <div className="suggestions"><span>TRY</span>{['Plan my day','Add a task','Summarize notes'].map(x => <button key={x} onClick={() => setPrompt(x)}>{x}</button>)}</div>
        </div>
        <div className="hero-art" aria-hidden="true"><span className="landscape-hill hill-back"/><span className="landscape-hill hill-front"/></div>
      </section>
      <section className="stats-grid"><article className="stat-card goal-card"><div className="stat-top"><span>Today’s goals</span><span className="stat-icon lavender"><Check size={16}/></span></div><div className="stat-value">{percent}<small>%</small></div><div className="progress-track"><span style={{ width: `${percent}%` }}/></div><div className="stat-foot goal-appreciation">{appreciation}</div></article><article className="stat-card"><div className="stat-top"><span>Goals completed</span><span className="stat-icon pale-blue"><Sparkles size={16}/></span></div><div className="stat-value">{dailyCompleted} <small>/ {dailyTasks.length}</small></div><div className="mini-bars">{[35,55,42,70,48,88,58,75,47,67,39,82,56,72,44,61,85,50,69,42].map((height,i)=><i key={i} style={{height:`${height}%`, opacity: i < Math.round(percent / 5) ? 1 : .38}}/>)}</div><div className="stat-foot">Your day, one step at a time</div></article><article className="stat-card stat-reminder"><div className="stat-top"><span>A note for today</span><span className="stat-icon pale-peach"><Sun size={16}/></span></div><div className="reminder-title">{percent === 100 && dailyTasks.length ? 'You did what you set out to do.' : percent > 0 ? 'You’re finding your rhythm.' : 'You can begin whenever you’re ready.'}</div><div className="reminder-time">No rush <b>·</b> You’re right on time</div><div className="reminder-footer"><span className="reminder-indicator"/> Progress over perfection <MoreHorizontal size={17}/></div></article></section>
      <section className="content-grid"><article className="panel tasks-panel" id="tasks-section"><div className="panel-heading"><div><div className="panel-title">Daily notebook <span className="count">{dailyTasks.filter(task => task.status === 'pending').length} open</span></div><p>One step at a time, in due-time order.</p></div><button className="text-button" onClick={() => setTaskDialogOpen(true)}>Add task <span>＋</span></button></div><div className="task-list">{tasksLoading ? <div className="task-empty">Loading your saved tasks…</div> : notebookTasks.length === 0 ? <div className="task-empty">No tasks for this day yet. Add one or say “Create a task to …” above.</div> : notebookTasks.map((task, taskIndex)=><div className={`task-row notebook-row ${task.status === 'completed' ? 'task-complete' : ''}`} key={task.id}><span className="notebook-number">{String(taskIndex + 1).padStart(2, '0')}</span><button className={`task-check ${task.status === 'completed' ? 'checked' : ''}`} aria-label={`${task.status === 'completed' ? 'Mark' : 'Complete'} ${task.title}`} aria-pressed={task.status === 'completed'} onClick={() => void toggleTask(task)}>{task.status === 'completed' && <Check size={11}/>}</button><div className="task-main"><strong>{task.title}</strong><span><CalendarDays size={12}/> {taskDueLabel(task)}</span></div><span className={`tag ${categoryColor(task.category)}`}>{task.category}</span><span className={`priority ${task.priority.toLowerCase()}`}><i/>{task.priority}</span><button className="row-more" onClick={() => { if (window.confirm(`Delete “${task.title}”? This cannot be undone.`)) void fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }).then(response => { if (!response.ok) throw new Error(); setTasks(current => current.filter(item => item.id !== task.id)); setNotice(`“${task.title}” was deleted.`) }).catch(() => setNotice('Could not delete that task.')) }} aria-label={`Delete ${task.title}`} title="Delete task"><MoreHorizontal size={18}/></button></div>)}</div><button className="add-task" onClick={() => setTaskDialogOpen(true)}><Plus size={15}/> Add a task</button></article>
      <article className="panel schedule-panel" id="calendar-section"><div className="panel-heading"><div><div className="panel-title">Your calendar</div><p>{selectedDayLabel} | {dailyTasks.length} planned {dailyTasks.length === 1 ? 'task' : 'tasks'}</p></div><CalendarDays size={18}/></div><div className="calendar-summary"><span className="calendar-summary-icon"><CalendarDays size={20}/></span><div><strong>{dailyTasks.length}</strong><span>{dailyTasks.length === 1 ? 'task' : 'tasks'} in your notebook for {selectedDayLabel.toLowerCase()}</span></div></div><button className="calendar-link" onClick={() => navigate('My Tasks')}>Open daily notebook <span>+</span></button></article></section>
      <section className="panel notes-panel" id="notes-section"><div className="panel-heading"><div><div className="panel-title">Notes</div><p>Your notes are saved in this browser.</p></div><StickyNote size={18}/></div><textarea aria-label="Your notes" placeholder="Write down anything you would like to remember?" value={notes} onChange={event => setNotes(event.target.value)}/></section>
      <footer><span><Command size={12}/> A calmer way to get things done.</span><span>Made for your everyday <span className="footer-star">✳</span></span></footer></div>
    </main>
    {taskDialogOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setTaskDialogOpen(false) }}><form className="task-dialog" onSubmit={saveTaskFromDialog} aria-labelledby="task-dialog-title"><div className="dialog-heading"><div><span className="dialog-kicker">A SMALL STEP</span><h2 id="task-dialog-title">Add a task</h2><p>Give it a name. You can figure out the rest later.</p></div><button type="button" className="icon-button" onClick={() => setTaskDialogOpen(false)} aria-label="Close task form"><X size={18}/></button></div><label>Task name<input autoFocus required maxLength={240} placeholder="What would you like to get done?" value={taskTitle} onChange={event => setTaskTitle(event.target.value)}/></label><div className="dialog-fields"><label>Category<select value={taskCategory} onChange={event => setTaskCategory(event.target.value)}><option>Personal</option><option>Work</option><option>Study</option><option>Health</option></select></label><label>Priority<select value={taskPriority} onChange={event => setTaskPriority(event.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label></div><div className="dialog-fields"><label>Due date<input type="date" value={taskDueDate} onChange={event => setTaskDueDate(event.target.value)}/></label><label>Due time<input type="time" value={taskDueTime} onChange={event => { setTaskDueTime(event.target.value); if (event.target.value) { setTaskNotifyEnabled(true); if (!taskNotificationTime) setTaskNotificationTime(event.target.value); void requestBrowserNotifications() } }}/></label></div><div className="notification-settings"><label className="notify-toggle"><input type="checkbox" checked={taskNotifyEnabled} onChange={event => { setTaskNotifyEnabled(event.target.checked); if (event.target.checked) void requestBrowserNotifications() }}/><span>Send me a notification</span></label>{taskNotifyEnabled && <label className="notify-time-label">Notify me at<input type="time" value={taskNotificationTime} onChange={event => setTaskNotificationTime(event.target.value)}/></label>}<p>Notifications are silent by default.</p></div><div className="dialog-footer"><button type="button" className="cancel-task" onClick={() => setTaskDialogOpen(false)}>Cancel</button><button className="save-task" type="submit"><Plus size={15}/> Save task</button></div></form></div>}
  </div>
}
