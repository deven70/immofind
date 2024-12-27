import { PrismaClient } from '@prisma/client';
import response from '../components/utils/response.js';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const createProjectTypeListing = async (req, res) => {
  const { en_string, fr_string, icon, type, category, key } = req.body;

  // Ensure the required fields are provided
  if (!en_string || !fr_string || !icon || !type || !category || !key) {
    return response.error(res, res.__('messages.allFieldsRequired'), null, 400);
  }

  // Validate the key to ensure it does not contain spaces
  if (/\s/.test(key)) {
    return response.error(res, res.__('messages.keyCannotContainSpaces'), null, 400);
  }

  try {
    // Extract Bearer token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.error(res, 'Authorization token missing or invalid', null, 401);
    }

    const token = authHeader.split(' ')[1];

    // Decode the token to get the user ID (assuming JWT)
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return response.error(res, 'Invalid token', null, 401);
    }

    const created_by = decodedToken.id; // Adjust based on your token structure

    // Check if the key already exists in the database
    const existingKey = await prisma.projectTypeListings.findFirst({
      where: { key: key },
    });
    if (existingKey) {
      return response.error(res, res.__('messages.keyAlreadyExists'), null, 400);
    }

    // Check for existing project type listings for translations
    const checkExists = await prisma.projectTypeListings.findFirst({
      where: {
        lang_translations: {
          OR: [
            { en_string: en_string },
            { fr_string: fr_string },
          ],
        }
      }
    });

    if (!checkExists) {
      // Step 1: Insert translations into LangTranslations
      const langTranslation = await prisma.langTranslations.create({
        data: {
          en_string: en_string, // English translation
          fr_string: fr_string, // French translation
        },
      });

      console.log(langTranslation);
      const lang = res.getLocale();

      // Step 2: Insert the ProjectTypeListing and link it to the LangTranslation by ID
      const projectTypeListings = await prisma.projectTypeListings.create({
        data: {
          icon: icon,
          type: type,
          category: category,
          lang_translations: {
            connect: {
              id: langTranslation.id, // Link to the newly created LangTranslation
            },
          },
          key: key, // Use the original key here
          created_by: created_by
        },
      });

      // Step 3: Convert BigInt to string for response
      const responseData = {
        ...projectTypeListings,
        name: lang === 'fr' ? langTranslation.fr_string : langTranslation.en_string,
        category: projectTypeListings.category.toString(), // Convert BigInt to string
      };

      return await response.success(res, res.__('messages.projectTypeListingCreatedSuccessfully'), responseData);
    } else {
      return await response.error(res, res.__('messages.projectTypeCreated'));
    }

  } catch (error) {
    console.error('Error creating project type listing:', error);
    return await response.serverError(res, res.__('messages.projectTypeListingCreationError'));
  }
};

export const getProjectTypeListAll = async (req, res) => {
  try {
    const lang = res.getLocale();

    // Fetch total count of listings
    const totalCount = await prisma.projectTypeListings.count();

    // Fetch paginated PropertyTypeListings with related LangTranslations
    const listings = await prisma.projectTypeListings.findMany({
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
    // const responsePayload = {
    //   totalCount,
    //   totalPages: Math.ceil(totalCount / validLimit),
    //   currentPage: validPage,
    //   itemsPerPage: validLimit,
    //   list: simplifiedListings,
    // };

    return response.success( res, res.__('messages.projectTypeListingsFetchedSuccessfully'), simplifiedListings );
  } catch (error) {
    console.error('Error fetching property type listings:', error);
    return response.serverError(res, error);
  }
}



export const getProjectTypeListById = async (req, res) => {
  try {
    const { property_type_id } = req.body;

    // Validate input
    if (!property_type_id) {
      return response.error(res, res.__('messages.projectTypeIdRequired'));
    }

    const lang = res.getLocale();

    // Fetch property type listing with translations
    const propertyType = await prisma.projectTypeListings.findUnique({
      where: { id: property_type_id },
      include: {
        lang_translations: true, // Include the related LangTranslations
      },
    });

    // Check if property type was found
    if (!propertyType) {
      return response.error(res, res.__('messages.ProjectTypeNotFound'));
    }

    // Simplify the property type listing
    const simplifiedListing = {
      id: propertyType.id,
      icon: propertyType.icon,
      name: propertyType.lang_translations
        ? lang === 'fr'
          ? propertyType.lang_translations.fr_string // Fetch French translation
          : propertyType.lang_translations.en_string // Fetch English translation
        : 'No name available', // Fallback if no translation exists
      type: propertyType.type,
      key: propertyType.key,
      category: propertyType.category?.toString() || null, // Serialize BigInt to string
      created_at: propertyType.created_at,
      updated_at: propertyType.updated_at,
      created_by: propertyType.created_by,
      updated_by: propertyType.updated_by,
    };

    // Return success response with the simplified listing
    return response.success(res, res.__('messages.projectTypeFetchedSuccessfully'), simplifiedListing);
  } catch (error) {
    console.error('Error fetching project type:', error);
    return response.error(res, res.__('messages.internalServerError'), { message: error.message });
  }
};




export const getProjectTypeList = async (req, res) => {

  const { lang, page = 1, limit = 10 } = req.body; // Extract language, page, and limit from the request body

  try {
    // Ensure valid page and limit
    const validPage = Math.max(1, parseInt(page, 10));
    const validLimit = Math.max(1, parseInt(limit, 10));

    // Calculate offset (skip) for pagination
    const skip = (validPage - 1) * validLimit;

    // Fetch total count of listings
    const totalCount = await prisma.projectTypeListings.count();

    // Fetch paginated PropertyTypeListings with related LangTranslations
    const listings = await prisma.projectTypeListings.findMany({
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
      updated_by : listing.updated_by,
      created_by : listing.created_by
    }));

    // Return response with pagination metadata
    const responsePayload = {
      totalCount,
      totalPages: Math.ceil(totalCount / validLimit),
      currentPage: validPage,
      itemsPerPage: validLimit,
      list: simplifiedListings,
    };

    return response.success( res, res.__('messages.projectTypeListingsFetchedSuccessfully'), responsePayload );
  } catch (error) {
    console.error('Error fetching property type listings:', error);
    return response.serverError(res, error);
  }
/*
  try {
    const projectTypeListings = await prisma.projectTypeListings.findMany({
      where: {
        is_deleted: false, // Only fetch active records
      },
      include: {
        lang_translations: true, // Include associated translations
      },
    });

    // Format the response (convert BigInt fields to strings if necessary)
    // const formattedData = projectTypeListings.map((item) => ({
    //   ...item,
    //   category: item.category.toString(),
    //    // Convert BigInt to string
    // }));

    const formattedData = projectTypeListings.map((item) => {
      const lang = res.getLocale();
      const propetyName =
        lang === 'fr'
          ? item.lang_translations.fr_string
          : item.lang_translations.en_string;

          return {
            id: item.id,
            icon: item.icon,
            name: propetyName,
            type: item.type,
            key: item.key,
            category: item.category.toString(),
          }
    });
    return await response.success(res, res.__('messages.projectTypeListingsFetchedSuccessfully'), formattedData);
  } catch (error) {
    console.error('Error fetching project type listings:', error);
    return await response.error(res, res.__('messages.projectTypeListingFetchError'));
  }*/
};

export const updateProjectTypeListing = async (req, res) => {
  const { id, en_string, fr_string, icon, type, category, lang, key } = req.body;

  // Ensure the required fields are provided
  if (!id || !en_string || !fr_string || !icon || !type || !category || !lang || !key) {
    return response.error(res, res.__('messages.allFieldsRequired'), null, 400);
  }

  // Validate the key to ensure it does not contain spaces
  if (/\s/.test(key)) {
    return response.error(res, res.__('messages.keyCannotContainSpaces'), null, 400);
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.error(res, 'Authorization token missing or invalid', null, 401);
    }

    const token = authHeader.split(' ')[1];

    // Decode the token to get the user ID (assuming JWT)
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return response.error(res, 'Invalid token', null, 401);
    }

    const updated_by = decodedToken.id;

    // Step 1: Find the existing ProjectTypeListing
    const existingProjectTypeListing = await prisma.projectTypeListings.findUnique({
      where: { id },
      include: {
        lang_translations: true, // Fetch the related LangTranslation
      },
    });

    if (!existingProjectTypeListing) {
      return response.error(res, res.__('messages.projectTypeListingNotFound'), null, 404);
    }

    // Step 2: Check if the key already exists in the database for a different listing
    const existingKey = await prisma.projectTypeListings.findFirst({
      where: {
        key: key,
        NOT: {
          id: id, // Exclude the current listing being updated
        },
      },
    });

    if (existingKey) {
      return response.error(res, res.__('messages.keyAlreadyExists'), null, 400);
    }

    // Step 3: Update LangTranslations
    const updatedLangTranslation = await prisma.langTranslations.update({
      where: { id: existingProjectTypeListing.lang_translations.id },
      data: {
        en_string: en_string, // English translation
        fr_string: fr_string, // French translation
        updated_by: updated_by,
      },
    });

    // Step 4: Update the ProjectTypeListing
    const updatedProjectTypeListing = await prisma.projectTypeListings.update({
      where: { id },
      data: {
        icon: icon,
        type: type,
        category: category,
        updated_by: updated_by,
        lang_translations: {
          connect: {
            id: updatedLangTranslation.id, // Ensure the LangTranslation is linked
          },
        },
        key: key,
      },
    });

    // Step 5: Convert BigInt to string for response
    const lang = res.getLocale();

    const responseData = {
      ...updatedProjectTypeListing,
      name: lang === 'fr' ? updatedLangTranslation.fr_string : updatedLangTranslation.en_string,
      category: updatedProjectTypeListing.category.toString(), // Convert BigInt to string
    };

    return response.success(res, res.__('messages.projectTypeListingUpdatedSuccessfully'), responseData);
  } catch (error) {
    console.error('Error updating project type listing:', error);
    return response.error(res, res.__('messages.projectTypeListingUpdateError'));
  }
};

export const checkProjectTypeListing = async (req, res) => {
  try {
    const { key } = req.body;
    console.log(key);
    if (!key) {
      return response.error(res, 'Key is required', 400);
    }

    const listing = await prisma.projectTypeListings.findFirst({
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


export const deleteProjectTypeListing = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return response.error(res, res.__('messages.idRequired'), null, 400);
  }

  try {
    // Step 1: Fetch the ProjectTypeListing and its linked LangTranslations
    const existingProjectTypeListing = await prisma.projectTypeListings.findUnique({
      where: { id },
      include: {
        lang_translations: true,
      },
    });

    if (!existingProjectTypeListing) {
      return response.error(res, res.__('messages.projectTypeListingNotFound'), null, 404);
    }

    // Step 2: Delete records in a transaction
    await prisma.$transaction(async (prisma) => {
      // Check if propertyListings is properly defined in schema
      if (prisma.propertyListings) {
        // Delete dependent records in propertyListings (if exists)
        await prisma.propertyListings.deleteMany({
          where: {
            name: existingProjectTypeListing.lang_translations.id,
          },
        });
      }

      // Delete the ProjectTypeListing
      await prisma.projectTypeListings.delete({
        where: { id },
      });

      // Delete the linked LangTranslations
      if (existingProjectTypeListing.lang_translations?.id) {
        await prisma.langTranslations.delete({
          where: { id: existingProjectTypeListing.lang_translations.id },
        });
      }
    });

    // Step 3: Return success response
    return response.success( res, res.__('messages.projectTypeListingDeletedSuccessfully'), null );
  } catch (error) {
    console.error('Error deleting project type listing:', error);

    // Handle specific error cases
    if (error.code === 'P2003') {
      return response.error( res, res.__('messages.cannotDeleteProjectTypeListingDueToDependencies'));
    }

    return response.serverError(res, error);
  }
};

export const statusUpdateProjectTypeListing = async (req, res) => {
  const {id, status } = req.body;

  try {
      // Step 1: Validate that the status is provided
    if (status === undefined) {
      return await response.error(res, res.__('messages.statusRequired'));
    }

    // Step 2: Check if the project exists
    const existingProjectTypeListing = await prisma.projectTypeListings.findUnique({
      where: { id: id },
    });

    if (!existingProjectTypeListing) {
      return await response.error(res, res.__('messages.projectNotFound'));
    }

    // Step 3: Update the project status
    await prisma.projectTypeListings.update({
      where: { id: id },
      data: {
        status: status, // Update status field of the project
      },
    });

    // Step 4: Update project_meta_details if needed (e.g., for status or related info)
    await prisma.projectMetaDetails.updateMany({
      where: { project_type_listing_id: id }, // Ensure you update the related meta details
      data: {
        // Add any updates you need to perform on the meta details
        // status: status, // Example: update the status on meta details as well
        // is_deleted: status === 'inactive',
        project_type_listing_id: id 
      },
    });

      return await response.success(res, res.__('messages.ProjectTypeListingStatusUpdatedSuccessfully'), null);
  } catch (error) {
      console.error('Error statusUpdateProjectTypeListing:', error);
      return await response.serverError(res, res.__('messages.statusUpdateProjectTypeListing'));
  }
};
