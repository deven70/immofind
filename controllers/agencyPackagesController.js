import { PrismaClient } from '@prisma/client';
import response from '../components/utils/response.js';
import { validate as isUUID } from 'uuid'; // Import UUID validation helper
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

/**
 * Fetch all agency packages
 */
export const getAgencyPackage = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.body;

    // Ensure page and limit are valid numbers
    const validPage = Math.max(1, parseInt(page, 10)); // Default to 1 if invalid
    const validLimit = Math.max(1, parseInt(limit, 10)); // Default to 1 if invalid

    // Calculate the offset (skip) for pagination
    const skip = (validPage - 1) * validLimit;

    // Fetch total count for properties
    const totalCount = await prisma.agencyPackages.count();

    const agencyPackages = await prisma.agencyPackages.findMany({
      skip,
      take: validLimit,
      where: { is_deleted: false },
      include: {
        developers: true, // Include developers if needed
        language: true,
      },
    });
    const lang = res.getLocale();
    const agencyPackagesList = await agencyPackages.map((item) => {
      return {
        id: item.id,
        name: lang === 'fr' ? item.language.fr_string : item.language.en_string,
        type: item.type,
        created_by: item.created_by,
        updated_by: item.updated_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
        
      };
    });
    const responsePayload = {
      totalCount,
      totalPages: Math.ceil(totalCount / validLimit),
      currentPage: validPage,
      itemsPerPage: validLimit,
      list: agencyPackagesList,
    };
    return response.success(res, res.__('messages.listFetchedSuccessfully'), responsePayload);
  } catch (error) {
    console.error('Error fetching agency packages:', error);
    return response.serverError(res, res.__('messages.internalServerError'));
  }
};


export const getAgencyPackageById = async (req, res) => {
  try {
    const { agency_package_id } = req.body;

    // Validate input
    if (!agency_package_id) {
      return response.error(res, res.__('messages.agencyPackageIdRequired'), null, 400);
    }

    // Fetch the agency package by ID
    const agencyPackage = await prisma.agencyPackages.findUnique({
      where: { id: agency_package_id },
      include: {
        developers: true, // Include developers if needed
        language: true,   // Include language relation for translations
      },
    });

    if (!agencyPackage || agencyPackage.is_deleted) {
      return response.error(res, res.__('messages.agencyPackageNotFound'), null, 404);
    }

    // Get locale for language selection
    const lang = res.getLocale();

    // Prepare response object
    const responsePayload = {
      id: agencyPackage.id,
      name: lang === 'fr' ? agencyPackage.language?.fr_string : agencyPackage.language?.en_string,
      type: agencyPackage.type,
      created_by: agencyPackage.created_by,
      updated_by: agencyPackage.updated_by,
      created_at: agencyPackage.created_at,
      updated_at: agencyPackage.updated_at,
    };

    return response.success(res, res.__('messages.agencyPackageFetchedSuccessfully'), responsePayload);
  } catch (error) {
    console.error('Error fetching agency package:', error);
    return response.error(
      res,
      res.__('messages.internalServerError'),
      500,
      { message: error.message }
    );
  }
};



/**
 * Create a new agency package
 */
export const createAgencyPackage = async (req, res) => {
  try {
    const { en_string, fr_string, is_deleted, type } = req.body;


    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.error(res, 'Authorization token missing or invalid', null, 401);
    }

    const token = authHeader.split(' ')[1];

    // Decode the token to get the user ID (assuming JWT)
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = decodedToken.id; // Adjust based on your token structure

    if (!user_id) {
      return response.error(res, 'User ID is missing', null, 401);
    }


    // Step 1: Validate required fields
    if (!en_string && !fr_string) {
      return response.error(
        res,
        res.__('messages.fieldError', { field: 'en_string or fr_string' })
      );
    }

    // Step 2: Check for duplicate name
    const existingLangTranslation = await prisma.langTranslations.findFirst({
      where: {
        OR: [
          { en_string: en_string?.trim() },
          { fr_string: fr_string?.trim() },
        ],
      },
    });

    if (existingLangTranslation) {
      return response.error(
        res,
        res.__('messages.duplicateAgencyPackageName'),
        { existingLangTranslation }
      );
    }

    // Step 3: Create a new LangTranslation entry
    const langTranslation = await prisma.langTranslations.create({
      data: {
        en_string: en_string?.trim(),
        fr_string: fr_string?.trim(),
        created_by: user_id,
      },
    });

    // Step 4: Create a new agency package with the LangTranslation ID
    const newPackage = await prisma.agencyPackages.create({
      data: {
        name: langTranslation.id, // Store the LangTranslation ID as a reference
        type: type?.trim(), // Use the `type` from the request (should be "BASIC", "PREMIUM", etc.)
        is_deleted,
        created_at: new Date(), // Set created_at to the current time
        created_by: user_id,
      },
    });


    const lang = res.getLocale();
    const responseData = {
      id: newPackage.id,
      type: newPackage.type,
      name: lang === 'fr' ? langTranslation.fr_string : langTranslation.en_string,
      created_at: newPackage.created_at,
      updated_at: newPackage.updated_at,
      created_by: newPackage.created_by,
      updated_by: newPackage.updated_by,
    };

    return response.success(
      res,
      res.__('messages.agencyPackageCreatedSuccessfully'),
      responseData
    );
  } catch (error) {
    console.error('Error creating agency package:', error);
    return response.error(
      res,
      res.__('messages.errorCreatingAgencyPackage'),
      500,
      { message: error.message }
    );
  }
};


const isValidUUID = (id) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

/**
 * Update an agency package
 */
export const updateAgencyPackage = async (req, res) => {
  try {
    const { en_string, fr_string, is_deleted, type } = req.body;

    // Step 1: Validate Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.error(res, 'Authorization token missing or invalid', null, 401);
    }

    const token = authHeader.split(' ')[1];

    // Decode the token to get the user ID (assuming JWT)
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = decodedToken.id; // Adjust based on your token structure

    if (!user_id) {
      return response.error(res, 'User ID is missing', null, 401);
    }

    // Step 2: Find the existing agency package by ID
    const packageId = req.params.id.trim();
    const existingPackage = await prisma.agencyPackages.findUnique({
      where: { id: packageId },
    });

    if (!existingPackage) {
      return response.error(res, res.__('messages.agencyPackageNotFound'), 404);
    }

    // Step 3: Validate existing translation
    const existingTranslation = await prisma.langTranslations.findUnique({
      where: { id: existingPackage.name },
    });

    if (!existingTranslation) {
      return response.error(res, res.__('messages.translationNotFound'), 404);
    }

    // Step 4: Check for duplicate translations
    const duplicateTranslation = await prisma.langTranslations.findFirst({
      where: {
        OR: [
          { en_string: en_string?.trim() },
          { fr_string: fr_string?.trim() },
        ],
        id: { not: existingTranslation.id }, // Exclude the current translation
      },
    });

    if (duplicateTranslation) {
      return response.error(
        res,
        res.__('messages.duplicateAgencyPackageName'),
        { duplicateTranslation }
      );
    }

    // Step 5: Update the LangTranslation entry
    const updatedTranslation = await prisma.langTranslations.update({
      where: { id: existingTranslation.id },
      data: {
        en_string: en_string?.trim(),
        fr_string: fr_string?.trim(),
        updated_by: user_id,
      },
    });

    // Step 6: Update the agency package
    const updatedPackage = await prisma.agencyPackages.update({
      where: { id: packageId },
      data: {
        type: type?.trim(),
        is_deleted,
        updated_at: new Date(),
        updated_by: user_id,
      },
    });

    // Step 7: Construct response data
    const lang = res.getLocale();
    const responseData = {
      id: updatedPackage.id,
      type: updatedPackage.type,
      name: lang === 'fr' ? updatedTranslation.fr_string : updatedTranslation.en_string,
      created_at: updatedPackage.created_at,
      updated_at: updatedPackage.updated_at,
      created_by: updatedPackage.created_by,
      updated_by: updatedPackage.updated_by,
    };

    return response.success(
      res,
      res.__('messages.agencyPackageUpdatedSuccessfully'),
      responseData
    );
  } catch (error) {
    console.error('Error updating agency package:', error);
    return response.error(
      res,
      res.__('messages.errorUpdatingAgencyPackage'),
      500,
      { message: error.message }
    );
  }
};





/**
 * Soft delete an agency package
 */
export const deleteAgencyPackage = async (req, res) => {
  try {
    const id = req.params.id;

    // Step 1: Validate UUID format
    if (!id || !isUUID(id)) {
      return response.error(
        res,
        res.__('messages.invalidAgencyPackageIdFormat'), // Error for invalid UUID
        400
      );
    }

    // Step 2: Find the agency package by `id`
    const existingPackage = await prisma.agencyPackages.findUnique({
      where: { id },
    });

    if (!existingPackage) {
      return response.error(
        res,
        res.__('messages.agencyPackageNotFound'), // Error if package is not found
        404
      );
    }

    // Step 3: Delete the agency package
    await prisma.agencyPackages.delete({
      where: { id },
    });

    return response.success(
      res,
      res.__('messages.agencyPackageDeletedSuccessfully') // Success message
    );
  } catch (error) {
    console.error('Error deleting agency package:', error);

    // Handle specific Prisma error codes
    if (error.code === 'P2003') {
      return response.error(
        res,
        res.__('messages.foreignKeyConstraintViolation'), // Error for foreign key constraint
        400
      );
    } else if (error.code === 'P2025') {
      return response.error(
        res,
        res.__('messages.agencyPackageNotFound'), // Package not found
        404
      );
    }

    // Handle unexpected errors
    return response.error(
      res,
      res.__('messages.internalServerError'), // Generic server error message
      500,
      { message: error.message }
    );
  }
};