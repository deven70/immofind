import express from 'express';
import { getList } from '../controllers/dashboardController.js';
import { authorize } from '../middleware/authorization.js'; // Import the authorization middleware

const router = express.Router();

// Define your routes here
router.post('/list', authorize, getList); // Protected route

export default router;
