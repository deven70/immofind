import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'immofindmaroc@gmail.com',
      pass: 'ucvaphywafmiusgy',
    },
});
const sendmail = {
    gmail: async (to, subject, text) => {
        const mailOptions = {
            from: 'testing@gmail.com',
            to: to,
            subject: subject,
            html: text,
        };

        try {
            await new Promise((resolve, reject) => {
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  reject(error); // If there's an error, reject the promise
                } else {
                  resolve(info); // If email is sent successfully, resolve with info
                }
              });
            });
            return true;
        } catch (error) {
            return false;
        }
    },
    comparePassword: async (password, storedHash) => {
        return await bcrypt.compare(password, storedHash);
    },
};
export default sendmail;