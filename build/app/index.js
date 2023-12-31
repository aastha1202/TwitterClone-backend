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
exports.initServer = void 0;
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const index_1 = require("./user/index");
const cors_1 = __importDefault(require("cors"));
const jwt_1 = __importDefault(require("../services/jwt"));
const tweet_1 = require("./tweet");
function initServer() {
    return __awaiter(this, void 0, void 0, function* () {
        const app = (0, express_1.default)();
        app.use(body_parser_1.default.json());
        app.use((0, cors_1.default)());
        const graphqlServer = new server_1.ApolloServer({
            typeDefs: `
        ${index_1.User.types}
        ${tweet_1.Tweet.types}
         type Query{
            ${index_1.User.queries}
            ${tweet_1.Tweet.queries}
         }

         type Mutation {
            ${tweet_1.Tweet.mutation}
            ${index_1.User.mutation}
         }
        `,
            resolvers: Object.assign(Object.assign({ Query: Object.assign(Object.assign({}, index_1.User.resolvers.queries), tweet_1.Tweet.resolvers.queries), Mutation: Object.assign(Object.assign({}, tweet_1.Tweet.resolvers.mutation), index_1.User.resolvers.mutation) }, index_1.User.resolvers.extraresolver), tweet_1.Tweet.resolvers.extraresolver),
        });
        yield graphqlServer.start();
        app.use("/graphql", (0, express4_1.expressMiddleware)(graphqlServer, {
            context: ({ req, res }) => __awaiter(this, void 0, void 0, function* () {
                // console.log('Request Headers:', req.headers);
                // console.log('user',req.headers.authorization? JWTService.decodeToken(req.headers.authorization) :null)
                // console.log('Request Body:', req.body);
                return {
                    user: req.headers.authorization ? jwt_1.default.decodeToken(req.headers.authorization.split('Bearer ')[1]) : null
                };
            })
        }));
        return app;
    });
}
exports.initServer = initServer;
