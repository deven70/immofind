import express from 'express';
import { createState, getAllStates, getStateByStateId, updateState, deleteState} from '../controllers/stateController.js';
import { authorize } from '../middleware/authorization.js'; // Import the authorization middleware

const router = express.Router();


// Routes
router.post('/create', authorize, createState); // Create State
router.put('/update', authorize, updateState); // Create State
router.delete('/delete', authorize, deleteState); // Create State
router.post('/', authorize, getAllStates); // Get All States with Cities
router.post('/getid', authorize, getStateByStateId); // Get All States with Cities

export default router;
