const PASSWORD_KEY = 'calendar_state_password_'

export const useCalendarState = (options?: { 
  onSaveSuccess?: (url: string) => void,
  dayStates?: Ref<Record<string, string>>
}) => {
  const route = useRoute()
  const router = useRouter()
  
  const selectedYear = ref(new Date().getFullYear())
  const hideWeekendColors = ref(false)
  const holidaySummary = reactive({
    hrDays: [] as any[],
    fdDays: [] as any[]
  })

  const stateId = ref<string | null>(null)

  const hasEditAccess = ref(false)

  // Check if user has edit access for a state
  const checkEditAccess = (id: string) => {
    const savedPassword = localStorage.getItem(PASSWORD_KEY + id)
    return !!savedPassword
  }

  // Load state from KV storage
  const loadState = async (id: string) => {
    try {
      const { data } = await useFetch<{
        state: {
          selectedYear: number;
          hideWeekendColors: boolean;
          holidaySummary: { hrDays: any[]; fdDays: any[] };
          dayStates: Record<string, string>;
          password?: string;
        }
      }>(`/api/state?id=${id}`, {
        method: 'GET'
      })

      if (data.value?.state) {
        const state = data.value.state
        const savedPassword = localStorage.getItem(PASSWORD_KEY + id)
        hasEditAccess.value = savedPassword === state.password

        selectedYear.value = state.selectedYear
        hideWeekendColors.value = state.hideWeekendColors
        holidaySummary.hrDays = state.holidaySummary.hrDays
        holidaySummary.fdDays = state.holidaySummary.fdDays
        if (options?.dayStates && state.dayStates) {
          options.dayStates.value = state.dayStates
        }
      }
    } catch (error) {
      console.error('Failed to load state:', error)
    }
  }

  // Save state to KV storage
  const saveState = async () => {
    if (!hasEditAccess.value && stateId.value) return

    try {
      // Get existing password from localStorage or generate new one
      let password = stateId.value ? 
        localStorage.getItem(PASSWORD_KEY + stateId.value) : 
        crypto.randomUUID()

      // If no password exists, generate a new one
      if (!password) {
        password = crypto.randomUUID()
      }

      const state = {
        selectedYear: selectedYear.value,
        hideWeekendColors: hideWeekendColors.value,
        holidaySummary,
        dayStates: options?.dayStates?.value,
        password
      }

      const { data } = await useFetch<{ id: string }>('/api/state', {
        method: 'POST',
        body: {
          state,
          id: stateId.value,
          password
        }
      })

      if (data.value?.id) {
        const newId = data.value.id
        stateId.value = newId
        localStorage.setItem(PASSWORD_KEY + newId, password)
        hasEditAccess.value = true
        router.push(`/?id=${newId}`)
      }
    } catch (error) {
      console.error('Failed to save state:', error)
    }
  }

  // Share calendar (just copy URL)
  const shareCalendar = async () => {
    if (stateId.value) {
      const url = `${window.location.origin}/?id=${stateId.value}`
      await navigator.clipboard.writeText(url)
      options?.onSaveSuccess?.(url)
    }
  }

  // Create initial state or load from URL
  onMounted(async () => {
    const urlStateId = route.query.id
    if (urlStateId && typeof urlStateId === 'string') {
      stateId.value = urlStateId
      await loadState(urlStateId)
    } else {
      // Create initial state for new visitors
      await saveState()
    }
  })

  // Watch for changes and auto-save
  watch(
    [
      selectedYear,
      hideWeekendColors,
      holidaySummary,
      () => options?.dayStates?.value
    ], 
    async () => {
      if (stateId.value) {
        await saveState()
      }
    }, 
    { deep: true, immediate: false }
  )

  return {
    selectedYear,
    hideWeekendColors,
    holidaySummary,
    shareCalendar,
    hasEditAccess
  }
} 