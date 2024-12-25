import { PrismaClient } from '@prisma/client';
import response from '../components/utils/response.js';
import commonFunction from "../components/utils/commonFunction.js";

const prisma = new PrismaClient();
export const getList = async (req, res) => {
    try {
        const userInfo = await commonFunction.getLoginUser(req.user.id);
        const totalNormalUsersCount = await prisma.users.count({ where: { roles: { name: 'user' } } });
        const totalAgencyUsersCount = await prisma.users.count({ where: { roles: { name: 'agency' } } });
        const totalDeveloperUsersCount = await prisma.users.count({ where: { roles: { name: 'developer' } } });
        const totalUsersCount = await prisma.users.count();
        const whereCondition = (userInfo !== 'admin')?{ user_id: req.user.id }:{};
        const totalProjectCount = await prisma.projectDetails.count({where: whereCondition});
        const totalPropertyCount = await prisma.propertyDetails.count({where: whereCondition});
        const responseData = {
            total_users: totalUsersCount,
            project_count: totalProjectCount,
            property_count: totalPropertyCount  
        }
        response.success(res, res.__('messages.dashboardList'), responseData);
    } catch (error) {
        response.serverError(res, error);
    }
}
