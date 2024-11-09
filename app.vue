<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, getDaysInMonth as getDays, addDays } from 'date-fns'

interface Holiday {
  date: Date;
  name: string;
}

const selectedYear = ref(new Date().getFullYear())
const dayStates = ref<Record<string, string>>({})
const hideWeekendColors = ref(false)

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
  const goodFriday = addDays(easterSunday, -2)
  const ascensionDay = addDays(easterSunday, 39)
  const whitMonday = addDays(easterSunday, 50)

  return [
    { date: new Date(year, 0, 1), name: "New Year's Day" },
    { date: goodFriday, name: 'Good Friday' },
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

function toggleDayState(year: number, month: number, day: number) {
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
  
  let stateText = ''
  if (holidayName) {
    stateText = `- ${holidayName} (Public Holiday)`
  } else if (state === 'HR') {
    stateText = '- Holiday Requested'
  } else if (state === 'FD') {
    stateText = '- Free Day'
  }
  
  return `${weekday} ${formattedDate} ${stateText}`
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

// Load state from localStorage
onMounted(() => {
  const savedState = localStorage.getItem('calendarState')
  if (savedState) {
    dayStates.value = JSON.parse(savedState)
  }
})

// Save state to localStorage when it changes
watch(dayStates, (newState) => {
  localStorage.setItem('calendarState', JSON.stringify(newState))
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
  const hrDays: string[] = []
  const fdDays: string[] = []
  
  Object.entries(dayStates.value).forEach(([key, state]) => {
    const [year, month, day] = key.split('-').map(Number)
    
    // Only process entries for selected year
    if (year === selectedYear.value) {
      const date = format(new Date(year, month - 1, day), 'dd MMM yyyy')
      if (state === 'HR') hrDays.push(date)
      if (state === 'FD') fdDays.push(date)
    }
  })
  
  return {
    hrDays: hrDays.sort(),
    fdDays: fdDays.sort()
  }
})
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-8">
    <!-- Custom Tooltip -->
    <div
      v-show="showTooltip"
      class="fixed z-50 px-2 py-1 text-sm bg-gray-900 text-white rounded shadow-lg pointer-events-none"
      :style="{
        left: `${tooltipPosition.x}px`,
        top: `${tooltipPosition.y}px`
      }"
    >
      {{ tooltipContent }}
    </div>

    <!-- Calendar Grid -->
    <div class="grid gap-2 select-none">
      <template v-for="month in 12" :key="month">
        <div class="flex items-center gap-2">
          <!-- Month Label -->
          <div class="w-24 font-bold">
            {{ format(new Date(selectedYear, month - 1), 'MMMM') }}
          </div>
          
          <!-- Days -->
          <template v-for="day in getDaysInMonth(month)" :key="day">
            <div 
              class="h-8 w-8 flex items-center justify-center rounded text-sm transition-colors"
              :class="{
                'bg-green-200 not-allowed': !hideWeekendColors && getDayOfWeek(selectedYear, month, day) === 6,
                'bg-green-500 text-white not-allowed': !hideWeekendColors && getDayOfWeek(selectedYear, month, day) === 0,
                'cursor-pointer': isClickable(selectedYear, month, day),
                'cursor-not-allowed': !isClickable(selectedYear, month, day),
                'bg-red-600 text-white': !hideWeekendColors && isPublicHoliday(selectedYear, month, day),
                'bg-red-100 !text-red-600 border-2 border-red-400': dayStates[getDayKey(selectedYear, month, day)] === 'HR', 
                'bg-orange-100 !text-orange-600 border-2 border-orange-400': dayStates[getDayKey(selectedYear, month, day)] === 'FD', 
              }"
              @click="isClickable(selectedYear, month, day) && 
                     toggleDayState(selectedYear, month, day)"
              @mousemove="handleMouseMove($event, selectedYear, month, day)"
              @mouseleave="handleMouseLeave"
            >
              {{ dayStates[getDayKey(selectedYear, month, day)] || day }}
            </div>
          </template>
        </div>
      </template>
    </div>

    <!-- Year Input and Totals -->
    <div class="mt-8 flex items-center gap-4">
      <input 
        type="number" 
        v-model="selectedYear"
        class="border rounded px-3 py-1"
      >
      <button 
        @click="resetYear"
        class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Reset Year
      </button>
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          v-model="hideWeekendColors"
          class="sr-only peer"
        >
        <div class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all">
        </div>
        <span class="text-sm">Hide Weekend and Public Holiday Colors</span>
      </label>
    </div>

    <!-- Summary Section -->
    <div class="mt-4 grid grid-cols-2 gap-8 text-sm h-[200px]">
      <div class="overflow-y-auto">
        <h3 class="font-bold mb-2 sticky top-0 bg-gray-100 text-red-600">Holiday Requests {{ holidaySummary.hrDays.length }}d / {{ totals.HRHours }}h:</h3>
        <ul class="list-disc pl-4">
          <li v-for="date in holidaySummary.hrDays" :key="date">
            {{ date }}
          </li>
          <li v-if="holidaySummary.hrDays.length === 0" class="text-gray-500 italic">
            No holiday requests
          </li>
        </ul>
      </div>
      <div class="overflow-y-auto">
        <h3 class="font-bold mb-2 sticky top-0 bg-gray-100 text-orange-600">Free Days {{ holidaySummary.fdDays.length }}d / {{ totals.FDHours }}h:</h3>
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
  </div>
</template>

<style scoped>
.not-allowed {
  cursor: not-allowed;
}
</style>
