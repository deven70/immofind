import { PrismaClient } from '@prisma/client';
import passwordGenerator from '../components/utils/passwordGenerator.js';
const prisma = new PrismaClient();

const AgencyModel = {
  createAgency: async (data) => {
    return await prisma.agency.create({
      data,
    });
  },
};

export default AgencyModel;