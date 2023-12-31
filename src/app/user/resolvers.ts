import {  PrismaClient, User } from "@prisma/client";
import axios from "axios";
import JWTService from "../../services/jwt";
import { GraphqlContext } from "../../interface";
import UserService from "../../services/user";
import { redisClient } from "../../redis";
interface GoogleTokenResult{
    iss?:string
    nbf?:string
    aud?:string
    sub?:string
    email:string
    email_verified:string
    azp?:string
    name?:string
    picture?:string
    given_name:string
    family_name?:string
    iat?:string
    exp?:string
    jti?:string
    alg?:string
    kid?:string
    typ?:string
    
}

const prisma= new PrismaClient();

const queries = {
    verifyGoogleToken : async (parent:any , {token}: {token:string})=>{
        const googleToken = token
        const googleOauthURL = new URL("https://oauth2.googleapis.com/tokeninfo");
        googleOauthURL.searchParams.set('id_token',googleToken) // pass google token as parameter in the URL

        const {data}= await axios.get<GoogleTokenResult>(googleOauthURL.toString(),{ // response of type googleTokenResult
            responseType:'json'
        })

        // check whether the user exists in our db or not
        const user = await prisma.user.findUnique({where: {email:data.email}})

        if(!user){
            await prisma.user.create({
                data:{
                    email:data.email,
                    firstName:data.given_name,
                    lastName:data.family_name,
                    profileImageURL:data.picture

                }
            })
        }

        const userinDB= await prisma.user.findUnique({where:{email:data.email}})

        if(!userinDB) 
        throw new Error('error')
        // generate a  token 
        const userToken=  JWTService.generateTokenForUser(userinDB) 

        return userToken

    },

    getCurrentUser: async (parent:any, args:any, ctx:GraphqlContext)=>{
        // console.log('ctx',ctx)
        const id = ctx.user?.id
        if(!id) return null
        const user = await prisma.user.findUnique({where :{id} })
        return user
    },

    getUserById: async(parent:any, {id}:{id : string}, ctx:GraphqlContext)=>{
        return await prisma.user.findUnique({where :{id} })
    }

}



// this is resolver for creating foriegn relation in graphql 
const extraresolver=  {
    //finding tweets of current user
    User :{
        tweets: (parent:User)=> {
            return prisma.tweet.findMany({where:{author:{id :parent.id} }})
        },
        // for following and followers
        // if A follows B then to find the followers of A I have to find in follows table where A id's in following column   
        followers: async(parent:User)=>{
           const result= await prisma.follows.findMany({where: {following:{id:parent.id}},
                include :{
                    follower: true,
                    following: true,
                }
            });
            // console.log(result)
            return result.map((el)=>el.follower)
        },
    
        followings: async(parent:User)=>{
            const result= await prisma.follows.findMany({where: {follower:{id:parent.id}},
                 include :{
                     follower: true,
                     following: true,
                 }
             });
            //  console.log(result)
             return result.map((el)=>el.following)
         },


         recommendedUser: async( parent:any, _:any, ctx:GraphqlContext)=>{
            const users: User[] = []
        
            if(!ctx.user) return []

            // if there is cache then load cache 
            const cachedValue = await redisClient.get(`RECOMMENDED_USERS:${ctx?.user?.id}`)
            if(cachedValue) return JSON.parse(cachedValue)


            const myFollowings = await prisma.follows.findMany({
                where:{
                    follower: {id: ctx.user.id},
            },
            include:{
                following: {include:{followers : {include: {following: true} } } }
            }
        })
           for ( const followings of myFollowings){
             for (const followingOfFollowedUser of followings.following.followers){
                // checking in my followings whether the recommended user is already being followed and also exclude current user
                if( followingOfFollowedUser.following.id !== ctx?.user.id && myFollowings.findIndex((e)=> e.followingId === followingOfFollowedUser.following.id ) <0){
                    // console.log(followingOfFollowedUser.following)
                    users.push(followingOfFollowedUser.following)
                }
             }
           }

           // set the cache for recommended users
           await redisClient.set(`RECOMMENDED_USERS:${ctx?.user?.id}`, JSON.stringify(users))

           return users
        }
    }
}


const mutation={
    followUser: async (parent: any, {to}:{to:string},ctx:GraphqlContext)=>{
        if(!ctx.user || !ctx.user?.id) throw new Error("Unauthenticated")

        await UserService.followUser(ctx.user.id,to)
        // as any user follows anyone cache needs to be deleted of recommended users 
        await redisClient.del(`RECOMMENDED_USERS:${ctx?.user?.id}`)
        return true
    },

    unfollowUser: async (parent: any, {to}:{to:string},ctx:GraphqlContext)=>{
        if(!ctx.user || !ctx.user?.id) throw new Error("Unauthenticated")

        await UserService.unfollowUser(ctx.user.id,to)
        await redisClient.del(`RECOMMENDED_USERS:${ctx?.user?.id}`)
        return true

    },

  
}

export const resolvers= {queries,extraresolver,mutation}