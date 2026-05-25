export default defineEventHandler(async () => {
  const response = await $fetch<string>('https://www.educdesign.lu/resources/calendar/1/calendar.ics', {
    responseType: 'text'
  })

  return response
})
