import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();
const prisma = new PrismaClient();
const commonFunction = {
    capitalize: async (str) => {
        const text = str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
       console.log(text);
        return text;  
    },
    checkPhonember: async (phone) => {
        const phoneNumber = phone.toString();
    
        if (phoneNumber.length === 10 && /^\d{10}$/.test(phoneNumber)) {
            return true;
        } else {
            return false;
        }
    },
    bigIntiger: async (userInfo) => {
        return JSON.parse(
            JSON.stringify(userInfo, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value
            )
          );    
    },
    getRole: async (role) => {
        switch (role) {
            case 'developer':
                return 'developer';
            case 'agency':
                return 'agency';
            default:
                return 'user';
        }
        const msg = message.replace(/'/g, "\\'");
        return msg;
    },
    checkDeviceType: async (deviceType) => {
        switch (deviceType) {
            case 'app':
                return 'app';
            case 'web':
                return 'web';
            default:
                return '';
        }
    },
    getLoginUser: async (id) => {
        const loginUserInfo = await prisma.users.findFirst({
            where: {
              id: id
            },
            include: {roles: true}
        });
        if(loginUserInfo){
            return loginUserInfo.roles.name;
        }else{
            return 'admin';
        }
    },
};
export default commonFunction;