import Redis from "ioredis";
import { IRedisService } from "../interfaces/IServices";
import { LessonProgress } from "../models/enrollmentModel";

export class RedisService implements IRedisService {
    private client: Redis;

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
        });

        this.client.on("error", (err) => console.error("Redis Client Error", err));
        this.client.ping()
            .then((result) => {
                if (result === "PONG") {
                    console.log("✅ Connected to Redis successfully!");
                } else {
                    console.log("⚠️ Redis ping returned:", result);
                }
            })
            .catch((err) => {
                console.error("❌ Redis connection failed:", err);
            });
    }

    async get(key: string): Promise<string | null> {
        return await this.client.get(key);
    }

    async set(key: string, value: string, expirySeconds?: number): Promise<void> {
        if (expirySeconds) {
            await this.client.set(key, value, "EX", expirySeconds);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async getProgress(userId: string, courseId: string): Promise<LessonProgress[] | null> {
        const key = `progress:${userId}:${courseId}`;
        const data = await this.get(key);
        return data ? JSON.parse(data) : null;
    }

    async setProgress(userId: string, courseId: string, progress: LessonProgress[], expirySeconds = 3600): Promise<void> {
        const key = `progress:${userId}:${courseId}`;
        await this.set(key, JSON.stringify(progress), expirySeconds);
    }

    async clearProgress(userId: string, courseId: string): Promise<void> {
        const key = `progress:${userId}:${courseId}`;
        await this.del(key);
    }
}

export const redisService = new RedisService();
