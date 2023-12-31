"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class UserService {
    static followUser(from, to) {
        return prisma.follows.create({
            data: {
                follower: { connect: { id: from } },
                following: { connect: { id: to } }
            }
        });
    }
    static unfollowUser(from, to) {
        return prisma.follows.delete({
            where: {
                followerId_followingId: { followerId: from, followingId: to }
            }
        });
    }
}
exports.default = UserService;
