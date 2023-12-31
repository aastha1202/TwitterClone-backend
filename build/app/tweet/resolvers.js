"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const client_1 = require("@prisma/client");
const redis_1 = require("../../redis");
const prisma = new client_1.PrismaClient();
const mutation = {
    createTweet: (parent, { payload }, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        // If user is not logged in 
        if (!ctx.user) {
            throw new Error('You are not authenticated');
        }
        const rateLimitFlag = yield redis_1.redisClient.get(`RATE_LIMIT_TWEET:${ctx.user.id}`);
        if (rateLimitFlag)
            throw new Error('Please wait...');
        const tweet = yield prisma.tweet.create({
            data: {
                content: payload.content,
                imageUrl: payload.imageUrl,
                author: { connect: { id: ctx.user.id } } // foreign relations 
            }
        });
        yield redis_1.redisClient.setex(`RATE_LIMIT_TWEET:${ctx.user.id}`, 10, 1);
        return tweet;
    })
};
// this is resolver for creating relation between tweet and user in graphql 
//finding user details of that tweet
const extraresolver = {
    Tweet: {
        author: (parent) => { return prisma.user.findUnique({ where: { id: parent.authorId } }); }
    }
};
const queries = {
    getAllTweets: () => __awaiter(void 0, void 0, void 0, function* () {
        // const cachedTweets= await redisClient.get(`GET_ALL_TWEETS`)
        // if (cachedTweets) return JSON.parse(cachedTweets)
        const tweets = prisma.tweet.findMany({ orderBy: { createdAt: 'desc' } });
        // console.log(`tweets`, tweets)
        // redisClient.set(`GET_ALL_TWEETS`, JSON.stringify(tweets))
        return tweets;
    }),
};
exports.resolvers = { mutation, extraresolver, queries };
