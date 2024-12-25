import { PrismaClient } from '@prisma/client';
import response from '../components/utils/response.js';
import { validate as isUUID } from 'uuid'; // Import UUID validation helper

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
        created_at: item.created_at,
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




/**
 * Create a new agency package
 */
export const createAgencyPackage = async (req, res) => {
  try {
    const { en_string, fr_string, created_by, is_deleted, type } = req.body;

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
        created_by,
      },
    });

    // Step 4: Create a new agency package with the LangTranslation ID
    const newPackage = await prisma.agencyPackages.create({
      data: {
        name: langTranslation.id, // Store the LangTranslation ID as a reference
        type: type?.trim(), // Use the `type` from the request (should be "BASIC", "PREMIUM", etc.)
        created_by,
        is_deleted,
        created_at: new Date(), // Set created_at to the current time
      },
    });

    return response.success(
      res,
      res.__('messages.agencyPackageCreatedSuccessfully'),
      newPackage
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
        const rawId = req.params.id.trim();
        const id = rawId.startsWith(':') ? rawId.slice(1) : rawId;

        // Validate UUID format
        if (!isValidUUID(id)) {
            return response.error(res, res.__('messages.invalidUUIDFormat'));
        }
        console.log('Received ID:', id);

        const { en_string, fr_string, created_by, is_deleted, type } = req.body;

        // Find the existing agency package by ID
        const existingPackage = await prisma.agencyPackages.findUnique({
            where: { id },
        });

        if (!existingPackage) {
            return response.error(res, res.__('messages.agencyPackageNotFound'), 404);
        }

        console.log('Existing package name:', existingPackage.name);

        // Validate the `name` field as UUID if required
        if (!isValidUUID(existingPackage.name)) {
            return response.error(res, res.__('messages.invalidNameFormatInPackage'));
        }

        // Find the existing translation
        const existingTranslation = await prisma.langTranslations.findUnique({
            where: { id: existingPackage.name },
        });

        if (!existingTranslation) {
            return response.error(res, res.__('messages.translationNotFound'), 404);
        }

        // Update the translation record
        const updatedTranslation = await prisma.langTranslations.update({
            where: { id: existingTranslation.id },
            data: {
                en_string,
                fr_string,
                updated_by: created_by,
            },
        });

        // Update the agency package
        const updatedPackage = await prisma.agencyPackages.update({
            where: { id: id },
            data: {
                type,
                updated_by: created_by,
                is_deleted,
                updated_at: new Date(),
            },
        });

        return response.success(
            res,
            res.__('messages.agencyPackageUpdatedSuccessfully'),
            updatedPackage
        );
    } catch (error) {
        console.error('Error updating agency package:', error);
        return response.error(res, res.__('messages.internalServerError'), 500);
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