import { PrismaClient } from '@prisma/client';
import response from '../components/utils/response.js';

const prisma = new PrismaClient();
const serializeBigInt = (data) => {
  if (typeof data === 'bigint') {
    return data.toString();  // Convert BigInt to string
  }
  if (Array.isArray(data)) {
    return data.map(serializeBigInt);  // Recursively process array
  }
  if (data !== null && typeof data === 'object') {
    const serializedData = {};
    for (const [key, value] of Object.entries(data)) {
      serializedData[key] = serializeBigInt(value);  // Recursively process object
    }
    return serializedData;
  }
  return data;  // Return the data as is if it's not BigInt
};
export const getAllPropertyTypeListings = async (req, res) => {
  const { lang, page = 1, limit = 10 } = req.body; // Extract language, page, and limit from the request body

  try {
    // Ensure valid page and limit
    const validPage = Math.max(1, parseInt(page, 10));
    const validLimit = Math.max(1, parseInt(limit, 10));

    // Calculate offset (skip) for pagination
    const skip = (validPage - 1) * validLimit;

    // Fetch total count of listings
    const totalCount = await prisma.propertyTypeListings.count();

    // Fetch paginated PropertyTypeListings with related LangTranslations
    const listings = await prisma.propertyTypeListings.findMany({
      skip,
      take: validLimit,
      include: {
        lang_translations: true, // Include the related LangTranslations based on `name`
      },
    });

    // Map the results and apply language selection
    const simplifiedListings = listings.map((listing) => ({
      id: listing.id,
      icon: listing.icon,
      name:
        listing.lang_translations
          ? lang === 'fr'
            ? listing.lang_translations.fr_string // Fetch French translation
            : listing.lang_translations.en_string // Fetch English translation
          : 'No name available', // Fallback if no translation exists
      type: listing.type,
      key: listing.key,
      category: listing.category?.toString() || null, // Serialize BigInt to string
      created_at: listing.created_at,
      updated_at: listing.updated_at,
    }));

    // Return response with pagination metadata
    const responsePayload = {
      totalCount,
      totalPages: Math.ceil(totalCount / validLimit),
      currentPage: validPage,
      itemsPerPage: validLimit,
      list: simplifiedListings,
    };

    return response.success( res, res.__('messages.listFetchedSuccessfully'), responsePayload );
  } catch (error) {
    console.error('Error fetching property type listings:', error);
    return response.serverError(res, error);
  }
};


// Get a single property type listing by ID
export const getPropertyTypeListingById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return response.error(res, res.__('messages.stateIdRequired'), 400);
    }

    const listing = await prisma.propertyTypeListings.findUnique({
      where: { id },
    });

    if (!listing) {
      return response.notFound(res, res.__('messages.listingNotFound'));
    }

    response.success(res, res.__('messages.listingFetchedSuccessfully'), listing);
  } catch (error) {
    response.serverError(res, error);
  }
};

export const checkProjectTypeListing = async (req, res) => {
  try {
    const { key } = req.body;
    console.log(key);
    if (!key) {
      return response.error(res, 'Key is required', 400);
    }

    const listing = await prisma.propertyTypeListings.findFirst({
      where: { key },
    });
    if (listing) {
      return response.error(res, 'Property Of key was Exist');
    }else{
      return response.success(res, 'Property Of key was not Exist', null);
    }
  } catch (error) {
    return response.serverError(res, error);
  }
};

// Create a new property type listing


export const createPropertyTypeListing = async (req, res) => {
  const { en_string, fr_string, icon, type, category, created_by, key } = req.body;

  // Ensure the required fields are provided
  if (!en_string || !fr_string || !icon || !type || !category || !key) {
    return response.error(res, res.__('messages.allFieldsRequired'), null, 400);
  }

  try {
    const checkPropertyTypeExists = await prisma.propertyTypeListings.findFirst({
      where: {
        lang_translations: {
          OR: [
            { en_string: en_string },
            { fr_string: fr_string },
          ],
        },
      },
    });

    if (!checkPropertyTypeExists) {
      // Step 1: Insert translations into LangTranslations
      const langTranslation = await prisma.langTranslations.create({
        data: {
          en_string: en_string, // English translation
          fr_string: fr_string, // French translation
        },
      });

      // Step 2: Insert the PropertyTypeListing and link it to the LangTranslation by ID
      const propertyTypeListing = await prisma.propertyTypeListings.create({
        data: {
          icon: icon,
          type: type,
          key: key,
          category: BigInt(category), // Ensure category is properly cast as BigInt
          created_by: created_by,
          lang_translations: {
            connect: {
              id: langTranslation.id, // Link to the newly created LangTranslation
            },
          },
        },
      });

      // Step 3: Return success response (convert BigInt to string if present)
      const responseData = {
        ...propertyTypeListing,
        category: propertyTypeListing.category.toString(), // Convert BigInt to string
      };

      return response.success(res, res.__('messages.propertyTypeListingCreatedSuccessfully'), responseData);
    } else {
      return response.error(res, res.__('messages.propertyTypeListingExists'));
    }
  } catch (error) {
    console.error('Error creating property type listing:', error);
    return response.serverError(res, error);
  }
};


export const updatePropertyTypeListing = async (req, res) => {
  const { id, en_string, fr_string, icon, type, category, updated_by, lang, key } = req.body;

  // Ensure the required fields are provided
  if (!id || !updated_by || !lang || !key) {
    return response.error(res, res.__('messages.allFieldsRequired'), null, 400);
  }

  try {
    // Step 1: Check if the PropertyTypeListing exists
    const existingPropertyTypeListing = await prisma.propertyTypeListings.findUnique({
      where: { id },
      include: {
        lang_translations: true, // Include the linked LangTranslations to check if update is needed
      },
    });

    if (!existingPropertyTypeListing) {
      return response.error(res, res.__('messages.propertyTypeListingNotFound'), null, 404);
    }

    // Step 2: If translations need to be updated, update the LangTranslations
    let updatedLangTranslation = existingPropertyTypeListing.lang_translations;

    if (en_string || fr_string) {
      updatedLangTranslation = await prisma.langTranslations.update({
        where: { id: existingPropertyTypeListing.lang_translations.id },
        data: {
          en_string: en_string || existingPropertyTypeListing.lang_translations.en_string,
          fr_string: fr_string || existingPropertyTypeListing.lang_translations.fr_string,
          updated_by: updated_by,  // Assuming you track the updater
        },
      });
    }

    // Step 3: Update the PropertyTypeListing with the provided details
    const updatedPropertyTypeListing = await prisma.propertyTypeListings.update({
      where: { id },
      data: {
        icon: icon || existingPropertyTypeListing.icon,
        type: type || existingPropertyTypeListing.type,
        category: category || existingPropertyTypeListing.category,
        updated_by: updated_by,
        lang_translations: {
          connect: {
            id: updatedLangTranslation.id,  // Link to the possibly updated LangTranslation
          },
        },
        key: key || existingPropertyTypeListing.key,
      },
    });

    // Step 4: Return success response (convert BigInt to string if present)
    const responseData = {
      ...updatedPropertyTypeListing,
      category: updatedPropertyTypeListing.category.toString(), // Convert BigInt to string
    };

    return response.success(
      res,
      res.__('messages.propertyTypeListingUpdatedSuccessfully'),
      responseData
    );
  } catch (error) {
    console.error('Error updating property type listing:', error);
    return response.serverError(res, error);
  }
};

export const deletePropertyTypeListing = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return response.error(res, res.__('messages.idRequired'), null, 400);
  }

  try {
    // Step 1: Fetch the PropertyTypeListing and its linked LangTranslations
    const existingPropertyTypeListing = await prisma.propertyTypeListings.findUnique({
      where: { id },
      include: {
        lang_translations: true,
      },
    });

    if (!existingPropertyTypeListing) {
      return response.error(res, res.__('messages.propertyTypeListingNotFound'), null, 404);
    }

    // Step 2: Delete records in a transaction
    await prisma.$transaction(async (prisma) => {
      // Check if propertyListings is properly defined in schema
      if (prisma.propertyListings) {
        // Delete dependent records in propertyListings
        await prisma.propertyListings.deleteMany({
          where: {
            name: existingPropertyTypeListing.lang_translations.id,
          },
        });
      }

      // Delete the PropertyTypeListing
      await prisma.propertyTypeListings.delete({
        where: { id },
      });

      // Delete the linked LangTranslations
      if (existingPropertyTypeListing.lang_translations?.id) {
        await prisma.langTranslations.delete({
          where: { id: existingPropertyTypeListing.lang_translations.id },
        });
      }
    });

    return response.success(
      res,
      res.__('messages.propertyTypeListingDeletedSuccessfully'),
      null
    );
  } catch (error) {
    console.error('Error deleting property type listing:', error);

    if (error.code === 'P2003') {
      return response.error(
        res,
        res.__('messages.cannotDeletePropertyTypeListingDueToDependencies'),
        null,
        400
      );
    }

    return response.serverError(res, error);
  }
};

export const statusUpdatePropertyTypeListing = async (req, res) => {
  const {id, status } = req.body;

  try {
      // Step 1: Validate that the status is provided
    if (status === undefined) {
      return await response.error(res, res.__('messages.statusRequired'));
    }

    // Step 2: Check if the project exists
    const existingPropertyTypeListing = await prisma.propertyTypeListings.findUnique({
      where: { id: id },
    });

    if (!existingPropertyTypeListing) {
      return await response.error(res, res.__('messages.propertyNotFound'));
    }

    // Step 3: Update the project status
    await prisma.propertyTypeListings.update({
      where: { id: id },
      data: {
        status: status, // Update status field of the project
      },
    });

    // Step 4: Update project_meta_details if needed (e.g., for status or related info)
    await prisma.propertyMetaDetails.updateMany({
      where: { property_type_id: id }, // Ensure you update the related meta details
      data: {
        // Add any updates you need to perform on the meta details
        // status: status, // Example: update the status on meta details as well
        is_deleted: status === 'inactive',
        // property_type_id: id 
      },
    });

      return await response.success(res, res.__('messages.propertyTypeListingStatusUpdatedSuccessfully'), null);
  } catch (error) {
      console.error('Error statusUpdatePropertyTypeListing:', error);
      return await response.serverError(res, res.__('messages.statusUpdatePropertyTypeListing'));
  }
};