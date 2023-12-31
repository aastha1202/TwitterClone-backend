import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import bodyParser from 'body-parser';
import {User} from './user/index'
import cors from 'cors'
import { GraphqlContext } from '../interface';
import JWTService from '../services/jwt';
import { Tweet } from './tweet';


export async function initServer() {
    const app = express();

    app.use(bodyParser.json())
    app.use(cors())

    const graphqlServer = new ApolloServer<GraphqlContext>({
        typeDefs:`
        ${User.types}
        ${Tweet.types}
         type Query{
            ${User.queries}
            ${Tweet.queries}
         }

         type Mutation {
            ${Tweet.mutation}
            ${User.mutation}
         }
        `,
        resolvers:{
            Query:{
               ...User.resolvers.queries,
               ...Tweet.resolvers.queries
            },
            Mutation:{
                ...Tweet.resolvers.mutation,
                ...User.resolvers.mutation
            },
            ...User.resolvers.extraresolver,
            ...Tweet.resolvers.extraresolver
        },
      introspection: true  
      });

    await graphqlServer.start()

    app.use("/graphql", expressMiddleware(graphqlServer, {
        context: async({req,res})=>{
            // console.log('Request Headers:', req.headers);
            // console.log('user',req.headers.authorization? JWTService.decodeToken(req.headers.authorization) :null)
            // console.log('Request Body:', req.body);
            return{
                user:  req.headers.authorization? JWTService.decodeToken(req.headers.authorization.split('Bearer ')[1]) :null
            }
        }
    }))

    return app
}