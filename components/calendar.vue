<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, getDaysInMonth as getDays, addDays, parse, parseISO, getWeek } from 'date-fns'

interface Holiday {
  date: Date;
  name: string;
}

interface SchoolHoliday {
  startDate: Date;
  endDate: Date;
  name: [{ language: string; text: string }];
}

const selectedYear = ref(new Date().getFullYear())
const dayStates = ref<Record<string, string>>({})
const betterViewMode = ref(false)
const schoolHolidays = ref<SchoolHoliday[]>([])
const showTextLetters = ref(true)

function getEasterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month, day)
}

// Calculate holidays for a given year
const holidays = computed(() => {
  const year = selectedYear.value
  const easterSunday = getEasterSunday(year)
  const easterMonday = addDays(easterSunday, 1)
  const ascensionDay = addDays(easterSunday, 39)
  const whitMonday = addDays(easterSunday, 50)

  return [
    { date: new Date(year, 0, 1), name: "New Year's Day" },
    { date: easterMonday, name: 'Easter Monday' },
    { date: new Date(year, 4, 1), name: 'Labour Day' },
    { date: new Date(year, 4, 9), name: 'Europe Day' },
    { date: ascensionDay, name: 'Ascension Day' },
    { date: whitMonday, name: 'Whit Monday' },
    { date: new Date(year, 5, 23), name: 'National Holiday' },
    { date: new Date(year, 7, 15), name: 'Assumption Day' },
    { date: new Date(year, 10, 1), name: "All Saints' Day" },
    { date: new Date(year, 11, 25), name: 'Christmas Day' },
    { date: new Date(year, 11, 26), name: "St. Stephen's Day" },
  ]
})

const holidayMap = computed(() => {
  const map = new Map<string, string>()
  holidays.value.forEach(holiday => {
    map.set(format(holiday.date, 'yyyy-M-d'), holiday.name)
  })
  return map
})

// Count totals
const totals = computed(() => {
  const counts = Object.entries(dayStates.value).reduce((acc, [key, state]) => {
    // Extract year from the key (format: "yyyy-m-d")
    const yearFromKey = parseInt(key.split('-')[0])

    // Only count if it matches selected year
    if (yearFromKey === selectedYear.value) {
      if (state === 'HR') acc.HR++
      if (state === 'FD') acc.FD++
    }
    return acc
  }, { HR: 0, FD: 0 })

  return {
    ...counts,
    HRHours: (counts.HR * 7.6).toFixed(1),
    FDHours: (counts.FD * 7.6).toFixed(1)
  }
})

function getDaysInMonth(month: number) {
  return getDays(new Date(selectedYear.value, month - 1))
}

function getDayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay()
}

function getDayKey(year: number, month: number, day: number) {
  return `${year}-${month}-${day}`
}

function isPublicHoliday(year: number, month: number, day: number) {
  const key = `${year}-${month}-${day}`
  return holidayMap.value.has(key)
}

function getHolidayName(year: number, month: number, day: number) {
  const key = `${year}-${month}-${day}`
  return holidayMap.value.get(key)
}

function isSaturday(year: number, month: number, day: number) {
  return getDayOfWeek(year, month, day) === 6
}

function isSunday(year: number, month: number, day: number) {
  return getDayOfWeek(year, month, day) === 0
}

function isWeekend(year: number, month: number, day: number) {
  return isSunday(year, month, day) || isSaturday(year, month, day)
}

// Add prop definition at the top of the script
const props = defineProps<{
  id?: string  // Optional string prop for the calendar ID
}>()

// Remove route-related code and replace with prop reference
const id = computed(() => props.id)

function toggleDayState(year: number, month: number, day: number) {
  if (id.value) return // Don't allow changes if viewing saved state

  const key = getDayKey(year, month, day)
  const currentState = dayStates.value[key] || ''

  if (!currentState) dayStates.value[key] = 'HR'
  else if (currentState === 'HR') dayStates.value[key] = 'FD'
  else dayStates.value[key] = ''
}

function isWeekday(dayOfWeek: number) {
  return dayOfWeek !== 0 && dayOfWeek !== 6
}

function isClickable(year: number, month: number, day: number) {
  const dayOfWeek = getDayOfWeek(year, month, day)
  return isWeekday(dayOfWeek) && !isPublicHoliday(year, month, day)
}

// Tooltip state
const tooltipContent = computed(() => {
  if (!tooltipDay.value) return ''
  const { year, month, day } = tooltipDay.value
  return getTooltipText(year, month, day)
})
const tooltipPosition = ref({ x: 0, y: 0 })
const showTooltip = ref(false)
const tooltipDay = ref<{ year: number; month: number; day: number } | null>(null)

function getTooltipText(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day)
  const weekday = format(date, 'EEEE')
  const formattedDate = format(date, 'dd/MM/yyyy')
  const key = getDayKey(year, month, day)
  const state = dayStates.value[key]
  const holidayName = getHolidayName(year, month, day)

  // Calculate week number
  const weekNumber = getWeekNumber(date)
  const isEvenWeek = weekNumber % 2 === 0
  const weekText = `Week ${weekNumber} (${isEvenWeek ? 'even' : 'odd'})`

  let stateText = ''
  if (holidayName) {
    stateText = `- ${holidayName} (Public Holiday)`
  } else if (state === 'HR') {
    stateText = '- Holiday Requested'
  } else if (state === 'FD') {
    stateText = '- Free Day'
  }

  // Add school holiday info
  const schoolHoliday = schoolHolidays.value.find(holiday => {
    const start = new Date(holiday.startDate)
    const end = new Date(holiday.endDate)
    return date >= start && date <= end
  })
  if (schoolHoliday) {
    stateText += ` - ${schoolHoliday.name[0].text}`
  }

  return `${weekText} - ${weekday} ${formattedDate} ${stateText}`
}

// Add this helper function to calculate ISO week number
function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf())
  const dayNumber = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNumber + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
}

function handleMouseMove(event: MouseEvent, year: number, month: number, day: number) {
  tooltipDay.value = { year, month, day }
  tooltipPosition.value = {
    x: event.pageX + 10,
    y: event.pageY + 10
  }
  showTooltip.value = true
}

function handleMouseLeave() {
  showTooltip.value = false
  tooltipDay.value = null
}

// Load state from localStorage or URL
onMounted(async () => {
  // First try to load the saved year
  const savedYear = localStorage.getItem('selectedYear')
  if (savedYear && !id.value) {
    selectedYear.value = parseInt(savedYear)
  }

  if (id.value) {
    // If we have an ID, load from Redis and make read-only
    await loadState(id.value)
  } else {
    // Only load from localStorage if no ID present
    const savedState = localStorage.getItem('calendarState')
    if (savedState) {
      dayStates.value = JSON.parse(savedState)
    }
  }

  // Fetch and parse ICS data
  try {
    const response = await fetch('https://www.educdesign.lu/resources/calendar/1/calendar.ics')
    if (response.ok) {
      const icsText = await response.text()
      console.log('ICS Data received:', icsText.substring(0, 200)) // Log first 200 chars
      const holidays = parseICSHolidays(icsText, selectedYear.value)
      console.log('Parsed holidays:', holidays) // Log parsed results
      schoolHolidays.value = holidays.map(holiday => ({
        startDate: holiday.start,
        endDate: holiday.end,
        name: [{ language: 'LU', text: holiday.summary }]
      }))
    }
  } catch (error) {
    console.error('Failed to fetch school holidays:', error)
  }
})

// Add a new watch for selectedYear
watch(selectedYear, (newYear) => {
  localStorage.setItem('selectedYear', newYear.toString())
})

// Only save to localStorage when there's no ID
watch(dayStates, (newState) => {
  if (!id.value) {
    localStorage.setItem('calendarState', JSON.stringify(newState))
  }
}, { deep: true })

function resetYear() {
  // Filter out entries for the selected year
  const newStates = Object.entries(dayStates.value).reduce((acc, [key, value]) => {
    const yearFromKey = parseInt(key.split('-')[0])
    if (yearFromKey !== selectedYear.value) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, string>)

  dayStates.value = newStates
}

// Add these computed properties after other computed properties
const holidaySummary = computed(() => {
  const hrDays: Date[] = []
  const fdDays: Date[] = []

  Object.entries(dayStates.value).forEach(([key, state]) => {
    const [year, month, day] = key.split('-').map(Number)

    // Only process entries for selected year
    if (year === selectedYear.value) {
      const date = new Date(year, month - 1, day)
      if (state === 'HR') hrDays.push(date)
      if (state === 'FD') fdDays.push(date)
    }
  })

  return {
    hrDays: hrDays.sort((a, b) => a.getTime() - b.getTime()).map(date => format(date, 'dd MMM yyyy')),
    fdDays: fdDays.sort((a, b) => a.getTime() - b.getTime()).map(date => format(date, 'dd MMM yyyy'))
  }
})

const router = useRouter()

// Add these refs for modal state
const showModal = ref(false)
const modalMessage = ref('')
const modalUrl = ref('')

// Modify saveState function
const saveState = async () => {
  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify({
        dayStates: dayStates.value,
        selectedYear: selectedYear.value
      })
    })
    const { id } = await response.json()

    // Create the full URL
    const url = `${window.location.origin}/${id}`

    // Copy to clipboard and show modal
    await navigator.clipboard.writeText(url)
    modalMessage.value = `Calendar URL copied to clipboard!`
    showModal.value = true
    modalUrl.value = url

    // Hide modal after 3 seconds
    setTimeout(() => {
      showModal.value = false
    }, 10000)
  } catch (error) {
    console.error('Failed to save state:', error)
    modalMessage.value = 'Failed to save calendar'
    showModal.value = true
  }
}

const loadState = async (id: string) => {
  try {
    const response = await fetch(`/api/${id}`)
    if (!response.ok) throw new Error('Failed to load')

    const data = await response.json()
    dayStates.value = data.dayStates
    selectedYear.value = data.selectedYear
  } catch (error) {
    console.error('Failed to load state:', error)
  }
}

// Add this to handle loading from URL on initial page load
onMounted(async () => {
  const route = useRoute()
  if (route.params.id) {
    await loadState(route.params.id as string)
  }
})

// Add this helper function
function isConnectedWeekend(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day)
  const dayOfWeek = date.getDay()

  // Only check Saturdays and Sundays
  if (dayOfWeek !== 0 && dayOfWeek !== 6) return null

  // For Saturday, check Friday and Monday
  if (dayOfWeek === 6) {
    const friday = new Date(date)
    friday.setDate(date.getDate() - 1)
    const monday = new Date(date)
    monday.setDate(date.getDate() + 2)

    const fridayKey = getDayKey(friday.getFullYear(), friday.getMonth() + 1, friday.getDate())
    const mondayKey = getDayKey(monday.getFullYear(), monday.getMonth() + 1, monday.getDate())
    const fridayState = dayStates.value[fridayKey]
    const mondayState = dayStates.value[mondayKey]
    const fridayIsHoliday = isPublicHoliday(friday.getFullYear(), friday.getMonth() + 1, friday.getDate())
    const mondayIsHoliday = isPublicHoliday(monday.getFullYear(), monday.getMonth() + 1, monday.getDate())

    // Return the state if either Friday or Monday has one, or is a holiday
    if (fridayIsHoliday || mondayIsHoliday) return 'HR'
    return fridayState || mondayState
  }

  // For Sunday, check Friday and Monday
  if (dayOfWeek === 0) {
    const friday = new Date(date)
    friday.setDate(date.getDate() - 2)
    const monday = new Date(date)
    monday.setDate(date.getDate() + 1)

    const fridayKey = getDayKey(friday.getFullYear(), friday.getMonth() + 1, friday.getDate())
    const mondayKey = getDayKey(monday.getFullYear(), monday.getMonth() + 1, monday.getDate())
    const fridayState = dayStates.value[fridayKey]
    const mondayState = dayStates.value[mondayKey]
    const fridayIsHoliday = isPublicHoliday(friday.getFullYear(), friday.getMonth() + 1, friday.getDate())
    const mondayIsHoliday = isPublicHoliday(monday.getFullYear(), monday.getMonth() + 1, monday.getDate())

    // Return the state if either Friday or Monday has one, or is a holiday
    if (fridayIsHoliday || mondayIsHoliday) return 'HR'
    return fridayState || mondayState
  }
}

// Add this helper function
function isConnectedHoliday(year: number, month: number, day: number) {
  if (!isPublicHoliday(year, month, day)) return null

  const date = new Date(year, month - 1, day)
  const prevDate = new Date(date)
  const nextDate = new Date(date)
  prevDate.setDate(date.getDate() - 1)
  nextDate.setDate(date.getDate() + 1)

  // Check previous day
  const prevKey = getDayKey(prevDate.getFullYear(), prevDate.getMonth() + 1, prevDate.getDate())
  const prevState = dayStates.value[prevKey]
  const prevIsWeekend = [0, 6].includes(prevDate.getDay())

  // Check next day
  const nextKey = getDayKey(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate())
  const nextState = dayStates.value[nextKey]
  const nextIsWeekend = [0, 6].includes(nextDate.getDay())

  // Return true if either adjacent day is a weekend or has HR/FD state
  return (prevState === 'HR' || prevState === 'FD' || prevIsWeekend ||
    nextState === 'HR' || nextState === 'FD' || nextIsWeekend)
}

// Add this function to check if a date is within school holidays
function isSchoolHoliday(year: number, month: number, day: number) {
  const monthStr = month < 10 ? `0${month}` : month
  const dayStr = day < 10 ? `0${day}` : day
  const dateStr = `${year}-${monthStr}-${dayStr}T00:00:00.000Z`
  const date = parseISO(dateStr)

  return schoolHolidays.value.some(holiday => {
    return date >= holiday.startDate && date < holiday.endDate
  })
}

// Add new ref for school holiday toggle
const showSchoolHolidays = ref(true)

// Add holiday name translations (after the imports)
const holidayTranslations: Record<string, string> = {
  'toussaint': 'All Saints Holiday',
  'noël': 'Christmas Holiday',
  'carnaval': 'Carnival Holiday',
  'pâques': 'Easter Holiday',
  'pentecôte': 'Pentecost Holiday',
  'travail': 'Labour Day',
  'été': 'Summer Holiday',
  'printemps': 'Spring Holiday',
  'hiver': 'Winter Holiday'
}

// Update the parseICSHolidays function to output UTC dates
function parseICSHolidays(icsData: string, targetYear: number) {
  const events: { start: Date; end: Date; summary: string }[] = []
  const lines = icsData.split(/\r?\n/)
  let currentEvent: Partial<{ start: string; end: string; summary: string }> = {}
  let inEvent = false

  for (const line of lines) {
    const cleanLine = line.trim()

    if (cleanLine === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
    } else if (cleanLine === 'END:VEVENT') {
      if (currentEvent.start && currentEvent.end && currentEvent.summary) {
        // Convert to UTC ISO strings
        const startStr = `${currentEvent.start.slice(0, 4)}-${currentEvent.start.slice(4, 6)}-${currentEvent.start.slice(6, 8)}T00:00:00.000Z`
        const endStr = `${currentEvent.end.slice(0, 4)}-${currentEvent.end.slice(4, 6)}-${currentEvent.end.slice(6, 8)}T00:00:00.000Z`

        // Translate the summary if a translation exists
        const translatedSummary = Object.entries(holidayTranslations)
          .find(entry => currentEvent.summary?.toLowerCase().includes(entry[0]))?.[1] ||
          currentEvent.summary

        events.push({
          start: parseISO(startStr),
          end: parseISO(endStr),
          summary: translatedSummary
        })
      }
      inEvent = false
    } else if (inEvent) {
      if (cleanLine.startsWith('DTSTART')) {
        currentEvent.start = cleanLine.split(':')[1]
      } else if (cleanLine.startsWith('DTEND')) {
        currentEvent.end = cleanLine.split(':')[1]
      } else if (cleanLine.startsWith('SUMMARY')) {
        currentEvent.summary = cleanLine.split(':')[1]
      }
    }
  }

  return events.filter(event => {
    const startYear = event.start.getUTCFullYear()
    const endYear = event.end.getUTCFullYear()
    return startYear >= 2024 || endYear >= 2024
  })
}

// Add new ref after other refs
const showMonthView = ref(true)

// Add helper function to organize days into weeks
function getMonthWeeks(month: number) {
  const daysInMonth = getDaysInMonth(month)
  const firstDayOfMonth = new Date(selectedYear.value, month - 1, 1)
  let firstDayWeekday = firstDayOfMonth.getDay()
  // Adjust for Monday start (0 = Monday, 6 = Sunday)
  firstDayWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1

  const weeks: { weekNum: number | null; days: number[] }[] = []
  let currentWeek: number[] = Array(firstDayWeekday).fill(0) // Padding days

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      const weekDate = new Date(selectedYear.value, month - 1, currentWeek.find(d => d !== 0) || 1)
      weeks.push({
        weekNum: getWeek(weekDate, { weekStartsOn: 1 }),
        days: currentWeek
      })
      currentWeek = []
    }
  }

  // Add padding to last week if needed
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(0)
    }
    const weekDate = new Date(selectedYear.value, month - 1, currentWeek.find(d => d !== 0) || 1)
    weeks.push({
      weekNum: getWeek(weekDate, { weekStartsOn: 1 }),
      days: currentWeek
    })
  }

  // Add extra weeks if we have less than 6, but with null week numbers
  while (weeks.length < 6) {
    weeks.push({
      weekNum: null,
      days: Array(7).fill(0)
    })
  }

  return weeks
}

// Add weekday labels
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDayClasses(year: number, month: number, day: number) {
  const dayKey = getDayKey(year, month, day)
  const isSchoolHol = showSchoolHolidays.value && isSchoolHoliday(year, month, day)
  const dayState = dayStates.value[dayKey]

  return {
    'text-white': (!betterViewMode.value && (isSunday(year, month, day) || isPublicHoliday(year, month, day))),
    'bg-blue-100': isSchoolHol && !isPublicHoliday(year, month, day),
    '!bg-green-200': !betterViewMode.value && isSaturday(year, month, day),
    '!bg-green-500 text-white': !betterViewMode.value && isSunday(year, month, day),
    'border-2 border-green-200': isWeekend(year, month, day) && !betterViewMode.value,
    'bg-red-600': (!betterViewMode.value && isPublicHoliday(year, month, day)),
    'cursor-pointer': !id.value && isClickable(year, month, day),
    'cursor-default': id.value || !isClickable(year, month, day),
    'bg-red-100': (dayState === 'HR' && !isSchoolHol || (dayState === 'HR' && betterViewMode.value)),
    'bg-orange-100': (dayState === 'FD' && !isSchoolHol  || (dayState === 'FD' && betterViewMode.value)),
    'border-2 border-red-400 text-red-600': dayState === 'HR',
    'border-2 border-orange-400 text-orange-600': dayState === 'FD',
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center bg-gray-100 p-8">
    <!-- Custom Tooltip -->
    <div v-show="showTooltip"
      class="fixed z-50 px-2 py-1 text-sm bg-gray-900 text-white rounded shadow-lg pointer-events-none" :style="{
        left: `${tooltipPosition.x}px`,
        top: `${tooltipPosition.y}px`
      }">
      {{ tooltipContent }}
    </div>

    <!-- Year Input and Totals -->
    <div class="mb-8 flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-4 flex-wrap">
        <!-- Edit Copy button when id exists -->
        <button v-if="id" @click="router.push('/')"
          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
          Go back to my holidays
        </button>

        <!-- Show as text when id exists -->
        <div v-if="id" class="rounded px-3 py-1 w-24 cursor-default text-3xl">
          {{ selectedYear }}
        </div>
        <!-- Show as input when no id -->
        <input v-else type="number" v-model="selectedYear" class="border rounded px-3 py-1 w-24">
        <button v-if="!id" @click="resetYear"
          class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
          Reset Year
        </button>
        <button v-if="!id" @click="saveState"
          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
          Share my holidays
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex flex-col gap-2 min-w-[200px]">

          <!-- Add new ref for school holiday toggle -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="showSchoolHolidays" class="sr-only peer">
            <div
              class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all">
            </div>
            <span class="text-sm">Show school holidays</span>
          </label>

          <!-- Add toggle button in the controls section around line 580 -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="showMonthView" class="sr-only peer">
            <div
              class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all">
            </div>
            <span class="text-sm">Month view</span>
          </label>

          <!-- Add the toggle in the template after the other toggles (around line 683) -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="showTextLetters" class="sr-only peer">
            <div
              class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all">
            </div>
            <span class="text-sm">Show text letters</span>
          </label>

          <!-- Existing betterViewMode toggle -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="betterViewMode" class="sr-only peer">
            <div
              class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all">
            </div>
            <span class="text-sm">Show only holiday</span>
          </label>

        </div>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="flex justify-center w-full">
      <div class="overflow-x-auto w-full max-w-full">
        <!-- Linear view (existing) -->
        <div v-if="!showMonthView" class="min-w-fit w-max mx-auto">
          <div class="grid gap-2 select-none">
            <template v-for="month in 12" :key="month">
              <div class="flex items-center gap-2">
                <!-- Month Label -->
                <div class="w-8 font-bold">
                  <span>{{ format(new Date(selectedYear, month - 1), 'MMM') }}</span>
                </div>

                <!-- Days -->
                <template v-for="day in getDaysInMonth(month)" :key="day">
                  <div class="h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded text-sm transition-colors"
                    :class="getDayClasses(selectedYear, month, day)" @click="isClickable(selectedYear, month, day) &&
                      toggleDayState(selectedYear, month, day)"
                    @mousemove="handleMouseMove($event, selectedYear, month, day)" @mouseleave="handleMouseLeave">
                    {{ showTextLetters ? (dayStates[getDayKey(selectedYear, month, day)] || day) : day }}
                  </div>
                </template>
              </div>
            </template>
          </div>
        </div>

        <!-- Month view (new) -->
        <div v-else class="w-full flex justify-center">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-fit">
            <div v-for="month in 12" :key="month" class="border rounded-lg p-2 sm:p-4 bg-white shadow w-[300px]">
              <h3 class="text-base sm:text-lg font-bold mb-2 sm:mb-4 text-center">
                {{ format(new Date(selectedYear, month - 1), 'MMMM') }}
              </h3>

              <!-- Weekday headers -->
              <div class="grid grid-cols-8 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                <!-- Week number header -->
                <div class="h-8 flex items-center justify-center text-xs sm:text-sm font-semibold text-gray-400">
                  W
                </div>
                <!-- Day headers -->
                <div v-for="label in weekdayLabels" :key="label"
                  class="h-8 flex items-center justify-center text-xs sm:text-sm font-semibold text-gray-600">
                  {{ label.slice(0, 2) }}
                </div>
              </div>

              <!-- Calendar grid -->
              <div class="grid grid-cols-8 gap-0.5 sm:gap-1 flex-grow">
                <template v-for="week in getMonthWeeks(month)" :key="week.weekNum">
                  <!-- Week number -->
                  <div
                    class="aspect-square flex items-center justify-center text-xs sm:text-sm text-gray-400 font-medium">
                    {{ week.weekNum !== null ? week.weekNum : '' }}
                  </div>
                  <!-- Days -->
                  <template v-for="day in week.days" :key="`${month}-${day}`">
                    <div v-if="day === 0" class="aspect-square flex items-center justify-center text-gray-300">
                    </div>
                    <div v-else
                      class="aspect-square flex items-center justify-center rounded text-xs sm:text-sm transition-colors"
                      :class="getDayClasses(selectedYear, month, day)"
                      @click="isClickable(selectedYear, month, day) && toggleDayState(selectedYear, month, day)"
                      @mousemove="handleMouseMove($event, selectedYear, month, day)" @mouseleave="handleMouseLeave">
                      {{ showTextLetters ? (dayStates[getDayKey(selectedYear, month, day)] || day) : day }}
                    </div>
                  </template>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Section -->
    <div class="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 text-sm">
      <div>
        <h3 class="font-bold mb-2 bg-gray-100 text-red-600 p-1">
          Holiday Requests {{ holidaySummary.hrDays.length }}d / {{ totals.HRHours }}h:
        </h3>
        <ul class="list-disc pl-4">
          <li v-for="date in holidaySummary.hrDays" :key="date">
            {{ date }}
          </li>
          <li v-if="holidaySummary.hrDays.length === 0" class="text-gray-500 italic">
            No holiday requests
          </li>
        </ul>
      </div>
      <div>
        <h3 class="font-bold mb-2 bg-gray-100 text-orange-600 p-1">
          Free Days {{ holidaySummary.fdDays.length }}d / {{ totals.FDHours }}h:
        </h3>
        <ul class="list-disc pl-4">
          <li v-for="date in holidaySummary.fdDays" :key="date">
            {{ date }}
          </li>
          <li v-if="holidaySummary.fdDays.length === 0" class="text-gray-500 italic">
            No free days
          </li>
        </ul>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed z-50 inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white p-6 rounded-lg">
        <p>{{ modalMessage }}</p>
        <a :href="modalUrl" target="_blank" rel="noopener noreferrer"
          class="text-blue-500 hover:text-blue-700 underline break-all">
          {{ modalUrl }}
        </a>
        <button @click="showModal = false"
          class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors block w-full">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-allowed {
  cursor: not-allowed;
}
</style>
