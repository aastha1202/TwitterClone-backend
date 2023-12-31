"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tweet = void 0;
// import { queries } from './queries';
const resolvers_1 = require("./resolvers");
const mutation_1 = require("./mutation");
const types_1 = require("./types");
const queries_1 = require("./queries");
exports.Tweet = { resolvers: resolvers_1.resolvers, types: types_1.types, mutation: mutation_1.mutation, queries: queries_1.queries };
