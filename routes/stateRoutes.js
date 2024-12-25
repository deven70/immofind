import express from 'express';
import { createState, getStates} from '../controllers/stateController.js';
import { authorize } from '../middleware/authorization.js'; // Import the authorization middleware

const router = express.Router();


// Routes
router.post('/create', authorize, createState); // Create State
router.post('/', authorize, getStates); // Get All States with Cities

export default router;
