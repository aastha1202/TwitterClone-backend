"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const queries_1 = require("./queries");
const resolvers_1 = require("./resolvers");
const mutation_1 = require("./mutation");
const types_1 = require("./types");
exports.User = { queries: queries_1.queries, resolvers: resolvers_1.resolvers, types: types_1.types, mutation: mutation_1.mutation };
