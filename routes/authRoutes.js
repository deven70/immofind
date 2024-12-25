import express from 'express';
import {createNormalUser,createUser, getallUser, getagency, getDeveloper, loginWithPassword, deleteUser, updateUser, getUser, loginUser,checkUserExists,sendOtp,updatePassword} from '../controllers/authController.js';
import passport from 'passport';
const router = express.Router();

// Google auth routes
router.post('/create-normal/user', createNormalUser);

router.post('/create/user', createUser);

router.post('/update/user', updateUser);

router.post('/delete/user', deleteUser);

router.post('/get/user', getUser);

router.post('/getall', getallUser);

router.post('/get/agency', getagency);

router.post('/get/developer', getDeveloper);

router.post('/login', loginUser);

router.post('/check/user', checkUserExists);

router.post('/sendotp', sendOtp);

router.post('/updatepassword', updatePassword);

router.post('/login/password', loginWithPassword);

export default router;
