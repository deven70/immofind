import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const JwtModel = {
  generateToken: async (id, email_address) => {
    return jwt.sign(
      { id: id, email_address: email_address },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );
  },
};
export default JwtModel;
