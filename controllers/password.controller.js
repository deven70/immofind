import bcrypt from 'bcryptjs';
import pool from '../db.js'; // Ensure the file path and extension are correct
import jwtGenerator from '../components/utils/jwtGenerator.js';

//FORGOT PASSWORD CONTROLLER
module.exports.forgot_password = async (req, res) => {
    // 1. Destructure the email from req.body
    const { email } = req.body;

    // 2. Get the user from the database
    const user = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

    // 3. Check if the user doesn't exist and return an error else return the email
    if (user.rows.length === 0) {
        return response.error(
            res,
            res.__('messages.accountNotFound'),
            null,
            404
        );
    }

    return response.success(
        res,
        res.__('messages.emailRetrieved'),
        { email: user.rows[0].email }
    );
};


//RESET PASSWORD CONTROLLER
module.exports.reset_password = async (req, res) => {
    try {
        // 1. Destructure the email and new password from req.body
        const { email, password } = req.body;

        // 2. Get the user from the database
        const user = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

        // 3. Check if user doesn't exist
        if (user.rows.length === 0) {
            return response.error(
                res,
                res.__('messages.accountNotFound'),
                null,
                404
            );
        }

        // 4. Encrypt the new password
        bcrypt.hash(password, 10, async (err, hashedPassword) => {
            if (err) {
                return response.error(
                    res,
                    res.__('messages.passwordEncryptionError'),
                    null,
                    500
                );
            }

            // 5. Update the database with the new password
            await pool.query("UPDATE users SET password=$2 WHERE email=$1", [
                email,
                hashedPassword,
            ]);

            // 6. Generate a token
            const token = jwtGenerator(user.rows[0].user_id);

            return response.success(
                res,
                res.__('messages.passwordUpdated'),
                { token }
            );
        });
    } catch (err) {
        return response.error(
            res,
            res.__('messages.internalServerError'),
            { error: err.message },
            500
        );
    }
};
