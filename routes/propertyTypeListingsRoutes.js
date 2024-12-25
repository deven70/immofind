import express from 'express';
import { getAllPropertyTypeListings, checkProjectTypeListing, createPropertyTypeListing,updatePropertyTypeListing,deletePropertyTypeListing,statusUpdatePropertyTypeListing} from '../controllers/propertyTypeListingsController.js';
import { authorize } from '../middleware/authorization.js'; // Import the authorization middleware
const router = express.Router();

router.post('/',authorize, getAllPropertyTypeListings);
router.post('/create',authorize, createPropertyTypeListing);
// router.post('/:id', getPropertyTypeListingById);
router.put('/:id',authorize, updatePropertyTypeListing);
router.delete('/:id',authorize, deletePropertyTypeListing);
router.post('/check',authorize, checkProjectTypeListing);
router.post('/statusUpdate',authorize, statusUpdatePropertyTypeListing);

export default router;
