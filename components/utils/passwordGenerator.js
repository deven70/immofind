import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const passwordGenerator = {
    encrypted: async (password) => {
        const saltRounds = 10; // Higher rounds make it more secure but slower
        return await bcrypt.hash(password, saltRounds);
    },
    comparePassword: async (password, storedHash) => {
        return await bcrypt.compare(password, storedHash);
    },
};
export default passwordGenerator;