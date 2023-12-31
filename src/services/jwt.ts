import { User } from "@prisma/client";
import Jwt  from "jsonwebtoken";
import { JWTUser } from "../interface";

const JWT_SECRET= '$secret1234'

class JWTService{
    public static generateTokenForUser(user:User){
        const payload:JWTUser = {
            id: user?.id,
            email: user?.email
        };

        const token = Jwt.sign(payload, JWT_SECRET)

        return token;
    }

    public static decodeToken(token:string){
        // console.log(Jwt.verify(token,JWT_SECRET) as JWTUser)
        try{

            return Jwt.verify(token,JWT_SECRET) as JWTUser
        }
        catch(error){
            return null
        }
    }
}

export default JWTService