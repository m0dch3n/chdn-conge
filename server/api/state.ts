import { Redis } from "@upstash/redis";
import { generateId } from '~/utils/id-generator'
import crypto from 'crypto'

const redis = Redis.fromEnv();

interface StateData {
  state: {
    selectedYear: number;
    hideWeekendColors: boolean;
    holidaySummary: { hrDays: any[]; fdDays: any[] };
    dayStates: Record<string, string>;
    password: string;
  };
  password: string;
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  console.log('state METHOD', method)

  // GET /api/state?id=xyz
  if (method === 'GET') {
    const query = getQuery(event)
    const id = query.id as string

    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'ID is required'
      })
    }

    const state = await redis.get(id) as StateData | null
    if (!state) {
      throw createError({
        statusCode: 404,
        message: 'State not found'
      })
    }

    // Remove password from the response
    const { password: _, ...safeState } = state.state
    console.log('state GET (safe)', safeState, id)
    return { state: safeState }
  }

  // Handle both POST and PUT
  if (method === 'POST' || method === 'PUT') {
    const body = await readBody(event)
    const id = body.id || generateId()
    
    // If updating existing state, verify password
    if (body.id) {
      const existingState = await redis.get(id) as StateData | null
      if (existingState && existingState.password !== body.password) {
        throw createError({
          statusCode: 403,
          message: 'Not authorized to update this state'
        })
      }
    }

    const stateData: StateData = {
      state: body.state,
      password: body.password
    }

    await redis.set(id, stateData, { ex: 60 * 60 * 24 * 30 })
    return { id }
  }
}) 