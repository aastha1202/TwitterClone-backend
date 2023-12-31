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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const jwt_1 = __importDefault(require("../../services/jwt"));
const user_1 = __importDefault(require("../../services/user"));
const redis_1 = require("../../redis");
const prisma = new client_1.PrismaClient();
const queries = {
    verifyGoogleToken: (parent, { token }) => __awaiter(void 0, void 0, void 0, function* () {
        const googleToken = token;
        const googleOauthURL = new URL("https://oauth2.googleapis.com/tokeninfo");
        googleOauthURL.searchParams.set('id_token', googleToken); // pass google token as parameter in the URL
        const { data } = yield axios_1.default.get(googleOauthURL.toString(), {
            responseType: 'json'
        });
        // check whether the user exists in our db or not
        const user = yield prisma.user.findUnique({ where: { email: data.email } });
        if (!user) {
            yield prisma.user.create({
                data: {
                    email: data.email,
                    firstName: data.given_name,
                    lastName: data.family_name,
                    profileImageURL: data.picture
                }
            });
        }
        const userinDB = yield prisma.user.findUnique({ where: { email: data.email } });
        if (!userinDB)
            throw new Error('error');
        // generate a  token 
        const userToken = jwt_1.default.generateTokenForUser(userinDB);
        return userToken;
    }),
    getCurrentUser: (parent, args, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // console.log('ctx',ctx)
        const id = (_a = ctx.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!id)
            return null;
        const user = yield prisma.user.findUnique({ where: { id } });
        return user;
    }),
    getUserById: (parent, { id }, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        return yield prisma.user.findUnique({ where: { id } });
    })
};
// this is resolver for creating foriegn relation in graphql 
const extraresolver = {
    //finding tweets of current user
    User: {
        tweets: (parent) => {
            return prisma.tweet.findMany({ where: { author: { id: parent.id } } });
        },
        // for following and followers
        // if A follows B then to find the followers of A I have to find in follows table where A id's in following column   
        followers: (parent) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield prisma.follows.findMany({ where: { following: { id: parent.id } },
                include: {
                    follower: true,
                    following: true,
                }
            });
            // console.log(result)
            return result.map((el) => el.follower);
        }),
        followings: (parent) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield prisma.follows.findMany({ where: { follower: { id: parent.id } },
                include: {
                    follower: true,
                    following: true,
                }
            });
            //  console.log(result)
            return result.map((el) => el.following);
        }),
        recommendedUser: (parent, _, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            var _b, _c;
            const users = [];
            if (!ctx.user)
                return [];
            // if there is cache then load cache 
            const cachedValue = yield redis_1.redisClient.get(`RECOMMENDED_USERS:${(_b = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _b === void 0 ? void 0 : _b.id}`);
            if (cachedValue)
                return JSON.parse(cachedValue);
            const myFollowings = yield prisma.follows.findMany({
                where: {
                    follower: { id: ctx.user.id },
                },
                include: {
                    following: { include: { followers: { include: { following: true } } } }
                }
            });
            for (const followings of myFollowings) {
                for (const followingOfFollowedUser of followings.following.followers) {
                    // checking in my followings whether the recommended user is already being followed and also exclude current user
                    if (followingOfFollowedUser.following.id !== (ctx === null || ctx === void 0 ? void 0 : ctx.user.id) && myFollowings.findIndex((e) => e.followingId === followingOfFollowedUser.following.id) < 0) {
                        // console.log(followingOfFollowedUser.following)
                        users.push(followingOfFollowedUser.following);
                    }
                }
            }
            // set the cache for recommended users
            yield redis_1.redisClient.set(`RECOMMENDED_USERS:${(_c = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _c === void 0 ? void 0 : _c.id}`, JSON.stringify(users));
            return users;
        })
    }
};
const mutation = {
    followUser: (parent, { to }, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        var _d, _e;
        if (!ctx.user || !((_d = ctx.user) === null || _d === void 0 ? void 0 : _d.id))
            throw new Error("Unauthenticated");
        yield user_1.default.followUser(ctx.user.id, to);
        // as any user follows anyone cache needs to be deleted of recommended users 
        yield redis_1.redisClient.del(`RECOMMENDED_USERS:${(_e = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _e === void 0 ? void 0 : _e.id}`);
        return true;
    }),
    unfollowUser: (parent, { to }, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        var _f, _g;
        if (!ctx.user || !((_f = ctx.user) === null || _f === void 0 ? void 0 : _f.id))
            throw new Error("Unauthenticated");
        yield user_1.default.unfollowUser(ctx.user.id, to);
        yield redis_1.redisClient.del(`RECOMMENDED_USERS:${(_g = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _g === void 0 ? void 0 : _g.id}`);
        return true;
    }),
};
exports.resolvers = { queries, extraresolver, mutation };
