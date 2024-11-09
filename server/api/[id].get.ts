import { redis } from '../utils/redis'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID is required'
    })
  }

  try {
    const data = await redis.get(`calendar:${id}`)
    if (!data) {
      throw createError({
        statusCode: 404,
        message: 'Calendar not found'
      })
    }
    return data
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to load calendar state'
    })
  }
}) 