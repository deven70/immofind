import { PrismaClient } from '@prisma/client';
import passwordGenerator from '../components/utils/passwordGenerator.js';
const prisma = new PrismaClient();
const propertyModel = {
    getProperty: async () => {
        return await prisma.propertyDetails.findMany({
            include: {
                lang_translations: 
                {
                    select: {
                        en_string: true, // Select only the role name
                        fr_string: true, // Select only the role name
                  },
                },
                districts: {
                    select: {
                      name: true, // Select only the role name
                    },
                },
            },
        });
    },
};

export default propertyModel;