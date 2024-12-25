import express from 'express';
import { createPropertyType,getPropertyTypes,updatePropertyType,deletePropertyType, statusUpdatePropertyType  } from '../controllers/propertyTypeController.js';
import { authorize } from '../middleware/authorization.js'; // Import the authorization middleware

const router = express.Router();


// Route to create Property Type
router.post('/create',authorize, createPropertyType);
router.post('/', authorize,getPropertyTypes);
router.put('/:id',authorize, updatePropertyType);
router.delete('/:id',authorize, deletePropertyType );
router.post('/statusUpdate',authorize, statusUpdatePropertyType );

export default router;
