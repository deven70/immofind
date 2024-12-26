import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { PrismaClient } from '@prisma/client';
//import Agency from '../models/agencyModel.js';
import UserModel from '../models/userModel.js'; // Assuming you have a User model defined
//import { passport } from 'passport';
import jwtGenerator from "../components/utils/jwtGenerator.js";
import bcrypt from "bcrypt";
import passwordGenerator from "../components/utils/passwordGenerator.js";
import sendmail from "../components/utils/sendmail.js";
import crypto from 'crypto';
import response from "../components/utils/response.js";
import OTPGenerat from "../components/utils/OTPGenerat.js";
import commonFunction from "../components/utils/commonFunction.js";
import dotenv from 'dotenv';
dotenv.config();
// Initialize Prisma Client
const prisma = new PrismaClient();

export const createUser = async (req, res) => {
    //try {
        const { social_id, user_id, user_name, full_name, email_address, user_login_type, fcm_token, image_url, type, phone_number, password, device_type,country_code } = req.body;
        
        if (!user_name ||!full_name || !type || !device_type ) {
            return await response.error(res, res.__('messages.fieldError'));
        }

        
        if(user_login_type === 'NONE'){
            if(email_address === '' ) {
                return await response.error(res, 'Please enter the email address');
            }
            const checkPhonember = await commonFunction.checkPhonember(phone_number);
            if(!checkPhonember){
                return await response.error(res,'Please enter the phone number');
            }
        } else{
            if(email_address === '' && phone_number === '') {
                return await response.error(res, 'Please check the email address and phone number was empty');
            }
        }
        
        const checkUser = await UserModel.getUser(email_address,phone_number);

        let user_information = false;
        if(checkUser){
            if(!user_id){
                return await response.error(res,'Please enter the User Id');
            }
            user_information = true;
            if( checkUser.id !== user_id){
                return await response.error(res,res.__('messages.userCheckEmail'));
            }

            const data = {  
                full_name: full_name? full_name: null,
                user_name: user_name? user_name: null,
                fcm_token: fcm_token? fcm_token: null,
                image: image_url? image_url: null,
                social_id: social_id? social_id: null,
                password: (password)? await passwordGenerator.encrypted(password):null,
                email_address: email_address,
                mobile_number: (phone_number)? BigInt(phone_number):null,
                country_code: country_code? country_code: null
            };
            const where = {
                id: user_id
            };
            const userUpdate = await UserModel.updateUser(where, data);
            const CreateToken = await jwtGenerator.generateToken(userUpdate.id, userUpdate.email_address);
            const responseData = {
                user_information,
                userProfile: userUpdate,
                token: CreateToken
            };
            
            const roleName = await commonFunction.getRole(userUpdate.roles.name);
            return await response.success(res, res.__(`messages.${roleName}CreatedSuccessfully`), responseData);
        } else{

            if((user_login_type === 'NONE') && (!password)) {
                return await response.error(res, res.__('messages.fieldError'));
            }
            const users = await UserModel.createUser({
                full_name: full_name? full_name: null,
                user_name: user_name? user_name: null,
                fcm_token: fcm_token? fcm_token: null,
                image: image_url? image_url: null,
                social_id: social_id? social_id: null,
                email_address: email_address,
                roles: {
                    connect: {
                      name: type,
                      status: true, 
                    },
                },
                user_login_type: user_login_type,
                mobile_number: (phone_number)? BigInt(phone_number):null,
                password: (password)? await passwordGenerator.encrypted(password):null,
                country_code: country_code? country_code: null
            });
            const CreateToken = await jwtGenerator.generateToken(users.id, users.email_address);
            const responseData = {
                user_information,
                userProfile: users,
                token: CreateToken
            };
            const roleName = await commonFunction.getRole(users.roles.name);
            return await response.success(res, res.__(`messages.${roleName}CreatedSuccessfully`), responseData);
        }
        // Respond with success message and user information
    // } catch (error) {
    //     return await response.serverError(res, res.__('messages.internalServerError'));
    // }
};


export const updateUser = async (req, res) => {
    try {
        const { social_id, user_id, user_name, full_name, email_address, user_login_type, fcm_token, image_url, type, phone_number, password, is_deleted } = req.body;
        
        if (!user_name ||!full_name || !type || !user_id ) {
            return await response.error(res, res.__('messages.fieldError'));
        }

        if(email_address === '' && phone_number === '') {
            return await response.error(res, res.__('messages.fieldError'));
        }

        const checkPhonember = await commonFunction.checkPhonember(phone_number);
        if(!checkPhonember){
            return await response.error(res,res.__('messages.validPhoneNumber'));
        }

        const data = {  
            full_name: full_name? full_name: null,
            user_name: user_name? user_name: null,
            fcm_token: fcm_token? fcm_token: null,
            image: image_url? image_url: null,
            social_id: social_id? social_id: null,
            password: (password)? await passwordGenerator.encrypted(password):'',
            email_address: email_address,
            mobile_number: BigInt(phone_number),
            is_deleted: is_deleted
        };
        const where = {
            id: user_id
        };
        const userUpdate = await UserModel.updateUser(where, data);
        const CreateToken = await jwtGenerator.generateToken(userUpdate.id, userUpdate.email_address);
        const responseData = {
            user_information: true,
            userProfile: userUpdate,
            token: CreateToken
        };
        const roleName = await commonFunction.getRole(userUpdate.roles.name);
        return (is_deleted)? await response.success(res, res.__(`messages.${roleName}DeleteSuccessfully`), responseData)
        : await response.success(res, res.__(`messages.${roleName}CreatedSuccessfully`), responseData);
        // Respond with success message and user information
    } catch (error) {
        return await response.serverError(res, res.__('messages.internalServerError'));
    }
};

export const deleteUser = async (req, res) => {
    const { id, type } = req.body;

    if(!id || !type) {
        return await response.error(res, res.__('messages.fieldError'));
    }

     try {
        const userData = await UserModel.deleteUser(id);
        if (userData) {
            //const roleName = await commonFunction.getRole(userData.roles.name);
            return await response.success(res, 'Deleted Successfully', null);
        } else {
            return await response.error(res, res.__(`messages.${type}NotFound`));
        }
    } catch (error) {
         return await response.error(res, 'Please check that user id is already used on another table');
    }
}

export const createNormalUser = async (req, res) => {
    try {
        const { user_name, full_name, email_address, user_login_type, fcm_token, image_url, type, mobile_number, password } = req.body;
        
        if (!user_name ||!full_name || !email_address || !type || !password) {
            return res.status(400).json({ error: "Please check the Fields." });
        }

        const checkUser = await UserModel.getUser(email_address,'');
        let users;
        let message;
        if(checkUser){
            return res.status(200).json({
                status: false,
                message: 'User already exist. Please login',
                data: null,
            });
        } else{
            users = await UserModel.createUser({
                full_name: full_name,
                user_name: user_name,
                email_address: email_address,
                fcm_token: fcm_token,
                image: image_url,
                roles: {
                    connect: {
                      name: type,
                      status: true, 
                    },
                },
                user_login_type: user_login_type,
                mobile_number: mobile_number,
                password: await passwordGenerator.encrypted(password),
            });
        }
        // Create or update the user in the database
        if(users){
            const CreateToken = await jwtGenerator.generateToken(users.id, users.email_address);
            return res.status(200).json({
                status: true,
                message: 'User created successfully',
                data: users,
            });
        }
        // Respond with success message and user information
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: 'Internal server error',
            data: error.message,
        });
    }
};

export const getallUser = async (req, res) => {
    const { type } = req.body;
    const userData = await UserModel.getAllUserd(type);
    console.log(userData.length);
    const userList = {
        count : userData.length,
        user_data : userData
    }
    if (userData) {
        return await response.success(res, res.__('messages.listFetchedSuccessfully'), userList);
    } else {
        return await response.error(res, res.__('messages.listingNotFound'));
    }
}

export const getagency = async (req, res) => {
    const { type } = req.body;
    const userData = await UserModel.getagencyUsered();
    console.log(userData.length);
    const userList = {
        count : userData.length,
        user_data : userData
    }
    if (userData) {
        return await response.success(res, res.__('messages.listFetchedSuccessfully'), userList);
    } else {
        return await response.error(res, res.__('messages.listingNotFound'));
    }
}

export const getDeveloper = async (req, res) => {
    const { type } = req.body;
    const userData = await UserModel.getdeveloperUsered();
    console.log(userData.length);
    const userList = {
        count : userData.length,
        user_data : userData
    }
    if (userData) {
        return await response.success(res, res.__('messages.listFetchedSuccessfully'), userList);
    } else {
        return await response.error(res, res.__('messages.listingNotFound'));
    }
}
export const getUser = async (req, res) => {
    
    const { email_address,password } = req.body;
    
    if (!email_address || !password) {
        return await response.error(res, res.__('messages.fieldError'));
    }
    const user = await UserModel.getUser(email_address,'');

    if (user && user.password) {
        try {
            const isMatch = await passwordGenerator.comparePassword(password, user.password);
            if (isMatch) {
                const CreateToken = await jwtGenerator.generateToken(user.id, user.email_address);
                const responseData = {
                    userProfile: user,
                    token: CreateToken
                };
                return await response.success(res, res.__('messages.loginSuccessfully'), responseData);
            } else {
                return await response.error(res, res.__('messages.passwordDostMatch'));
                }
        } catch (error) {
            return await response.error(res, res.__('messages.passwordDostMatch'));
        }
    } else {
        return await response.error(res, res.__('messages.userNotFound'));
    }
}

export const checkUserExists = async (req, res) => {
    
    const { email_address, phone_number, social_id } = req.body;

    if (email_address === "" && social_id === "") {
        return await response.error(res, 'Please enter email address or Social id');
    }

    let user;
    if(social_id) {
        if ( social_id === "") {
            return await response.error(res, 'Please enter social id');
        }
        user = await UserModel.getSocialUser(social_id);
        console.log(user);
    } else {
        if ( email_address === "") {
            return await response.error(res, 'Please enter email address');
        }
        user = await UserModel.getUser(email_address,phone_number);
    }
    if (user) {
        const CreateToken = await jwtGenerator.generateToken(user.id, user.email_address);
        const checkUser = await UserModel.getUser(user.email_address,'');
        let user_information = true;
        if(checkUser.mobile_number === 0) {
            user_information = false;
        }
        const responseData = {
            user_information,
            userProfile: user,
            token: CreateToken
        };
        const roleName = await commonFunction.getRole(user.roles.name);
        return await response.success(res, res.__(`messages.${roleName}Exists`), responseData);
    } else {
        return await response.error(res, res.__('messages.userNotFound'));
    }
    
    
}

export const loginUser = async (req, res) => {
    try {
        const { email_address, phone_number, code } = req.body;

        if (!email_address && !phone_number) {
            return await response.error(res, res.__('messages.fieldError'));
        }

        if (email_address && !phone_number) {
            const checkUser = await UserModel.getUser(email_address, '');
            if (!checkUser) {
                return await response.error(res, res.__('messages.userNotFound'));
            }

            if (!code) {
                return await response.error(res, res.__('messages.fieldError'));
            }

            if (checkUser.email_password_code !== parseInt(code, 10)) {
                return await response.error(res, res.__('messages.userCheckEmailCode'));
            }

            const CreateToken = await jwtGenerator.generateToken(checkUser.id, checkUser.email_address);
            const responseData = {
                user_information: !!checkUser.mobile_number,
                userProfile: checkUser,
                token: CreateToken
            };

            // Invalidate OTP
            await UserModel.updateUser({ id: checkUser.id }, { email_password_code: null });

            return await response.success(res, res.__('messages.loginSuccessfully'), responseData);
        } else if (!email_address && phone_number) {
            const checkPhoneNumber = await commonFunction.checkPhonember(phone_number);
            if (!checkPhoneNumber) {
                return response.error(res, "Please enter a valid phone number.", null);
            }

            const checkUser = await UserModel.getUser('', phone_number);
            if (!checkUser) {
                return await response.error(res, res.__('messages.userNotFound'));
            }

            if (!code) {
                return await response.error(res, res.__('messages.fieldError'));
            }

            if (checkUser.phone_password_code !== parseInt(code, 10)) {
                return await response.error(res, res.__('messages.passwordDostMatch'));
            }

            const CreateToken = await jwtGenerator.generateToken(checkUser.id, checkUser.email_address);
            const responseData = {
                user_information: !!checkUser.email_address,
                userProfile: checkUser,
                token: CreateToken
            };

            // Invalidate OTP
            await UserModel.updateUser({ id: checkUser.id }, { phone_password_code: null });

            return await response.success(res, res.__('messages.loginSuccessfully'), responseData);
        } else {
            return await response.error(res, res.__('messages.userNotFound'));
        }
    } catch (error) {
        return await response.serverError(res, res.__('messages.internalServerError'));
    }
};


export const loginWithPassword = async (req, res) => {
    try {
        const { email_address, phone_number, password, device_type, code } = req.body;
    
        // Validation checks
        if ((email_address === '' && phone_number === '') || !password || !device_type) {
            return await response.error(res, res.__('messages.fieldError'));
        }
    
        // Helper function to handle user login logic
        const handleUserLogin = async (user, isEmail) => {
            if ((user.roles.name === 'user') && (device_type === 'app')) {
                return await response.error(res, res.__('messages.checkDeviceTypeRole'));
            }
    
            let user_information = isEmail ? user.mobile_number !== 0 : user.email_address !== null;
            const OTPCheck = isEmail ? await UserModel.getUserWithEmailOTP(user.email_address, code) : await UserModel.getUserWithPhoneOTP(user.mobile_number, code);

            if (user && user.password) {
                try {
                    const isMatch = await passwordGenerator.comparePassword(password, user.password);

                    if (isMatch) {
                        const CreateToken = await jwtGenerator.generateToken(user.id, user.email_address);
                        const responseData = {
                            user_information,
                            userProfile: user,
                            token: CreateToken
                        };
                        return await response.success(res, res.__('messages.loginSuccessfully'), responseData);
                    } else {
                        return await response.error(res, res.__('messages.passwordDostMatch'));
                        }
                } catch (error) {
                    return await response.error(res, res.__('messages.passwordDostMatch'));
                }
            } else {
                return await response.error(res, res.__('messages.userNotFound'));
            }
        };
    
        // Process based on email or phone number
        if (email_address !== '') {
            const user = await UserModel.getUser(email_address, '');
            if (user) {
                return await handleUserLogin(user, true);
            } else {
                return await response.error(res, res.__('messages.userNotFound'));
            }
        } else if (phone_number !== '') {
            const isValidPhone = await commonFunction.checkPhonember(phone_number);
            if (!isValidPhone) {
                return await response.error(res, "Please enter a valid phone number.", null);
            }
    
            const user = await UserModel.getUser('', phone_number);
            if (user) {
                return await handleUserLogin(user, false);
            } else {
                return await response.error(res, res.__('messages.userNotFound'));
            }
        }
    
        // Default fallback for missing email or phone number
        return await response.error(res, res.__('messages.fieldError'));
    } catch (error) {
        return await response.serverError(res, res.__('messages.internalServerError'));
    }    
}

export const sendOtp = async (req, res) => {
    try {
        const { email_address, phone_number, type, user_login_type, device_type } = req.body;
    
        // Validate device type
        if (!device_type) {
            return await response.error(res, res.__('messages.fieldError'));
        }
    
        const deviceType = await commonFunction.checkDeviceType(device_type);
        if (deviceType !== 'app') {
            return await response.error(res, res.__('messages.checkDeviceType'));
        }
    
        let userDetails = null;
        let verificationCode = null;
    
        // Email verification case
        if (email_address !== '') {
            const checkEmail = await UserModel.getUser(email_address, '');
            if (checkEmail && checkEmail.roles.name !== 'user') {
                return await response.error(res, res.__('messages.checkDeviceTypeRole'));
            }
    
            verificationCode = crypto.randomInt(100000, 999999); // Generate a random 6-digit code
            const subject = "Verify Account";
            const text = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #007BFF;">Account Verification</h2>
                    <p>Dear User,</p>
                    <p>Your verification code is: <strong>${verificationCode}</strong>.</p>
                    <p>Please enter this code to verify your account.</p>
                    <p>If you didn’t request this, please ignore this message or contact our support team immediately.</p>
                    <br>
                    <p>Thank you,</p>
                    <p>The Immofind Team</p>
                </div>`;
    
            // Send email
            const emailData = await sendmail.gmail(email_address, subject, text);
            if (!emailData) {
                return response.error(res, res.__('messages.emailSendFailed'));
            }
    
            const data = { email_password_code: verificationCode };
            userDetails = checkEmail ? { ...checkEmail, ...data } : { email_address, email_password_code: verificationCode, roles: { connect: { name: type, status: true } }, user_login_type };
    
        // Phone verification case
        } else if (phone_number !== '') {
            const isValidPhone = await commonFunction.checkPhonember(phone_number);
            if (!isValidPhone) {
                return response.error(res, "Please enter a valid phone number.");
            }
    
            const checkMobileNumber = await UserModel.getUser('', phone_number);
            if (checkMobileNumber && checkMobileNumber.roles.name !== 'user') {
                return await response.serverError(res, res.__('messages.checkDeviceTypeRole'));
            }
    
            const sendOTP = await OTPGenerat.send(process.env.COUNTRY_CODE + phone_number);
            if (!sendOTP) {
                return response.error(res, res.__('messages.otpFailed'));
            }
    
            verificationCode = parseInt(sendOTP.otp, 10);
            const data = { phone_password_code: verificationCode };
    
            userDetails = checkMobileNumber 
                ? { id: checkMobileNumber.id, ...data } 
                : { mobile_number: BigInt(phone_number), roles: { connect: { name: 'user', status: true } }, user_login_type: "NONE", ...data };
        }
    
        // Handle user creation or update
        if (userDetails) {
            const userOperation = userDetails.id 
                ? await UserModel.updateUser({ id: userDetails.id }, { email_password_code: userDetails.email_password_code, phone_password_code: userDetails.phone_password_code })
                : await UserModel.createUser(userDetails);
    
            if (!userOperation) {
                return response.error(res, res.__('messages.userDataNotUpdated'));
            }
    
            return response.success(res, res.__('messages.userSendEmail'), { code: verificationCode });
        }
    
        return response.error(res, res.__('messages.fieldError'));
    } catch (error) {
        return await response.serverError(res, res.__('messages.internalServerError'));
    }    
}
export const updatePassword = async (req, res) => {
    try {
        const { email_address, code, password } = req.body;
        
        if (!password ||!code || !email_address) {
            return await response.error(res, res.__('messages.fieldError'));
        }

        const checkEmail = await UserModel.getUser(req.body.email_address, '');
        if(checkEmail){
            const data = {
                password: await passwordGenerator.encrypted(password),
            }
            const where = {
                email_address: email_address,
                reset_password_token: code
            }
            const userUpdate = await UserModel.updateUser(where, data);
            if(userUpdate){
                return await response.success(res, res.__('messages.passwordUpdateSuccessfully'), null);
            }else {
                return await response.error(res, res.__('messages.userDataNotUpdated'));
            }
        }else{
            return await response.error(res, res.__('messages.userNotFound'));
        }
    } catch (error) {
        return await response.serverError(res, res.__('messages.internalServerError'));
    }
}