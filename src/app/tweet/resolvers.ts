import { Prisma, PrismaClient, Tweet } from "@prisma/client"
import { GraphqlContext } from "../../interface"
import { redisClient } from "../../redis"

interface CreateTweetData{
    content: string
    imageUrl?: string
  } 

  
  const prisma= new PrismaClient();
  const mutation={

    createTweet: async (parent:any, {payload}:{payload: CreateTweetData }, ctx:GraphqlContext)=>{
        // If user is not logged in 
        if(!ctx.user)
        {
            throw new Error('You are not authenticated')
        }

        const rateLimitFlag =  await redisClient.get(`RATE_LIMIT_TWEET:${ctx.user.id}`)
        if (rateLimitFlag) throw new Error( 'Please wait...')

        const tweet=  await prisma.tweet.create({
            data:{
                content : payload.content,
                imageUrl : payload.imageUrl,
                author : {connect:{id: ctx.user.id}}  // foreign relations 
            }
         })

         await redisClient.setex(`RATE_LIMIT_TWEET:${ctx.user.id}`,10,1)

         return tweet
    }

    

}

// this is resolver for creating relation between tweet and user in graphql 
//finding user details of that tweet
const extraresolver= {
    Tweet:{
        author:(parent: Tweet)=>{return prisma.user.findUnique({where:{id: parent.authorId}})}
        
    }
}


const queries ={
    getAllTweets :async ()=> { 
        // const cachedTweets= await redisClient.get(`GET_ALL_TWEETS`)
        // if (cachedTweets) return JSON.parse(cachedTweets)

        const tweets= prisma.tweet.findMany({orderBy:{createdAt:'desc'}})
        // console.log(`tweets`, tweets)
        // redisClient.set(`GET_ALL_TWEETS`, JSON.stringify(tweets))

        return tweets
    
    },
   

   
}

export const resolvers={mutation,extraresolver,queries}