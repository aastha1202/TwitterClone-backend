"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const ioredis_1 = require("ioredis");
exports.redisClient = new ioredis_1.Redis(process.env.REDIS_URL);
