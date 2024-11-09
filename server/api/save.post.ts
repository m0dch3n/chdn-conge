import { nanoid } from 'nanoid'
import { redis } from '../utils/redis'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const id = nanoid(10) // generates a 10-character unique ID
  
  try {
    await redis.set(`calendar:${id}`, body)
    return { success: true, id }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to save calendar state'
    })
  }
}) 