<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, getDaysInMonth as getDays, addDays } from 'date-fns'

interface Holiday {
  date: Date;
  name: string;
}

const selectedYear = ref(new Date().getFullYear())
const dayStates = ref<Record<string, string>>({})
const betterViewMode = ref(false)
const showConnected = ref(false)
const showConnectedTooltip = ref(false)

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
    modalMessage.value = `Calendar URL copied to clipboard! (${url})`
    showModal.value = true
    
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
    const fridayKey = getDayKey(year, month, day - 1)
    const mondayKey = getDayKey(year, month, day + 2)
    const fridayState = dayStates.value[fridayKey]
    const mondayState = dayStates.value[mondayKey]
    const fridayIsHoliday = isPublicHoliday(year, month, day - 1)
    const mondayIsHoliday = isPublicHoliday(year, month, day + 2)
    
    // Return the state if either Friday or Monday has one, or is a holiday
    if (fridayIsHoliday || mondayIsHoliday) return 'HR'
    return fridayState || mondayState
  }
  
  // For Sunday, check Friday and Monday
  if (dayOfWeek === 0) {
    const fridayKey = getDayKey(year, month, day - 2)
    const mondayKey = getDayKey(year, month, day + 1)
    const fridayState = dayStates.value[fridayKey]
    const mondayState = dayStates.value[mondayKey]
    const fridayIsHoliday = isPublicHoliday(year, month, day - 2)
    const mondayIsHoliday = isPublicHoliday(year, month, day + 1)
    
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
</script>

<template>
  <div class="flex min-h-screen flex-col items-center bg-gray-100 p-8">
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

    <!-- Year Input and Totals -->
    <div class="mb-8 flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-4 flex-wrap">
        <!-- Edit Copy button when id exists -->
        <button 
          v-if="id"
          @click="router.push('/')"
          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Go back to my holidays
        </button>
        
        <!-- Show as text when id exists -->
        <div 
          v-if="id"
          class="rounded px-3 py-1 w-24 cursor-default text-3xl"
        >
          {{ selectedYear }}
        </div>
        <!-- Show as input when no id -->
        <input 
          v-else
          type="number" 
          v-model="selectedYear"
          class="border rounded px-3 py-1 w-24"
        >
        <button 
          v-if="!id"
          @click="resetYear"
          class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Reset Year
        </button>
        <button 
          v-if="!id"
          @click="saveState"
          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Share my holidays
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex flex-col gap-2 min-w-[200px]">
          <!-- Existing betterViewMode toggle -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              v-model="betterViewMode"
              class="sr-only peer"
            >
            <div class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all">
            </div>
            <span class="text-sm">Show only holiday</span>
          </label>

          <!-- Modified showConnected toggle -->
          <label 
            class="flex items-center gap-2 relative"
            :class="{ 'cursor-pointer': betterViewMode, 'opacity-50': !betterViewMode }"
            @mouseenter="!betterViewMode ? showConnectedTooltip = true : null"
            @mouseleave="showConnectedTooltip = false"
          >
            <input
              type="checkbox"
              v-model="showConnected"
              :disabled="!betterViewMode"
              class="sr-only peer"
              @change="!betterViewMode ? showConnected = false : null"
            >
            <div class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all">
            </div>
            <span class="text-sm">Show connected</span>
            
            <!-- Tooltip -->
            <div
              v-if="!betterViewMode && showConnectedTooltip"
              class="absolute left-0 -bottom-12 w-48 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg z-10"
            >
              Shows connected holidays when "Show only holiday" is enabled
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="flex justify-center w-full">
      <div class="overflow-x-auto w-full max-w-full">
        <div class="min-w-fit w-max mx-auto">
          <div class="grid gap-2 select-none">
            <template v-for="month in 12" :key="month">
              <div class="flex items-center gap-2">
                <!-- Month Label -->
                <div class="w-8 font-bold">
                  <span>{{ format(new Date(selectedYear, month - 1), 'MMM') }}</span>
                </div>
                
                <!-- Days -->
                <template v-for="day in getDaysInMonth(month)" :key="day">
                  <div 
                    class="h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded text-sm transition-colors"
                    :class="{
                      'bg-green-200': !betterViewMode && getDayOfWeek(selectedYear, month, day) === 6,
                      'bg-green-500 text-white': !betterViewMode && getDayOfWeek(selectedYear, month, day) === 0,
                      'cursor-pointer': !id && isClickable(selectedYear, month, day),
                      'cursor-default': id || !isClickable(selectedYear, month, day),
                      'bg-red-600 text-white': !betterViewMode && isPublicHoliday(selectedYear, month, day),
                      'bg-red-100 !text-red-600 border-2 border-red-400': dayStates[getDayKey(selectedYear, month, day)] === 'HR' || 
                        (showConnected && betterViewMode && isConnectedWeekend(selectedYear, month, day) === 'HR') ||
                        (showConnected && betterViewMode && isPublicHoliday(selectedYear, month, day) && isConnectedHoliday(selectedYear, month, day)), 
                      'bg-orange-100 !text-orange-600 border-2 border-orange-400': dayStates[getDayKey(selectedYear, month, day)] === 'FD' || 
                        (showConnected && betterViewMode && isConnectedWeekend(selectedYear, month, day) === 'FD'), 
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
    <div 
      v-if="showModal"
      class="fixed z-50 inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white p-6 rounded-lg">
        <p>{{ modalMessage }}</p>
        <button 
          @click="showModal = false"
          class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
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
