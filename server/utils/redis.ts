import { Redis } from "@upstash/redis"

// Export a singleton Redis instance
export const redis = Redis.fromEnv() 