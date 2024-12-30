import { PrismaClient } from '@prisma/client';
import response from '../components/utils/response.js';

const prisma = new PrismaClient();

export const getPropertyTypes = async (req, res) => {
  const { lang, page = 1, limit = 10 } = req.body; // Default values for page and limit

  try {
    // Fetch total count for pagination metadata
    const totalCount = await prisma.propertyTypes.count();

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Fetch paginated property types
    const propertyTypes = await prisma.propertyTypes.findMany({
      skip,
      take: limit,
      include: {
        lang_translations: true, // Include the related LangTranslations data
      },
    });

    // Process property types for the response
    const simplifiedProperties = await Promise.all(
      propertyTypes.map(async (property) => {
        const user = property.created_by
          ? await prisma.users.findUnique({
              where: { id: property.created_by },
              select: { user_name: true },
            })
          : null;

        return {
          id: property.id,
          title:
            property.lang_translations
              ? lang === 'fr'
                ? property.lang_translations.fr_string
                : property.lang_translations.en_string
              : 'No title available',
          created_by: user ? user.user_name : 'Unknown User', // Use the user name or fallback
          createdAt: property.created_at,
        };
      })
    );

    // Construct response with pagination metadata
    const responsePayload = {
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      itemsPerPage: limit,
      list: simplifiedProperties,
    };

    return response.success( res, res.__('messages.propertyTypesFetchedSuccessfully'), responsePayload );
  } catch (error) {
    console.error('Error fetching property types:', error);

    return response.error( res, res.__('messages.errorFetchingPropertyTypes') );
  }
};

export const createPropertyType = async (req, res) => {
  const { en_string, fr_string, created_by } = req.body;

  // Validate required fields
  if (!en_string || !fr_string ) {
    return response.error( res, res.__('messages.missingRequiredFields') );
  }

  try {

    const checkPropertTypeExits =await prisma.propertyTypes.findFirst({ 
      where: { 
        lang_translations: {
          OR: [
            { en_string: en_string },
            { fr_string: fr_string },
          ],
        }
      } 
    });
    console.log('checkPropertTypeExits');
    console.log(checkPropertTypeExits);
    if(!checkPropertTypeExits){
      // Insert the translations into LangTranslations
      const langTranslation = await prisma.langTranslations.create({
        data: {
          en_string, // English string
          fr_string, // French string
        },
      });

      // Insert into PropertyTypes with the LangTranslation ID
      const newPropertyType = await prisma.propertyTypes.create({
        data: {
          title: langTranslation.id, // Reference the LangTranslation entry
          created_by:created_by,
          created_at: new Date(),
        },
      });

      // Return success response
      return response.success( res, res.__('messages.propertyTypeCreatedSuccessfully'), newPropertyType );
    }else{
      return response.error( res, res.__('messages.propertyTypeListingExists') );
    }
  } catch (error) {
    console.error(error);
    // Return error response
    return response.error( res, res.__('messages.errorCreatingPropertyType'));
  }
};


export const updatePropertyType = async (req, res) => {
  const { id, en_string, fr_string, updated_by } = req.body;

  // Validate required fields
  if (!id || !updated_by) {
    return response.error( res, res.__('messages.missingRequiredFields') );
  }

  try {
    // Fetch the existing PropertyType to validate the ID
    const existingPropertyType = await prisma.propertyTypes.findUnique({
      where: { id },
    });

    if (!existingPropertyType) {
      return response.error( res, res.__('messages.propertyTypeNotFound') );
    }

    // Update the translations in LangTranslations
    await prisma.langTranslations.update({
      where: { id: existingPropertyType.title }, // Assuming `title` is the foreign key for LangTranslations
      data: {
        ...(en_string && { en_string }), // Update only if provided
        ...(fr_string && { fr_string }), // Update only if provided
      },
    });

    // Update the PropertyType record
    const updatedPropertyType = await prisma.propertyTypes.update({
      where: { id },
      data: {
        updated_by,
        updated_at: new Date(),
      },
    });

    // Return success response
    return response.success( res, res.__('messages.propertyTypeUpdatedSuccessfully'), updatedPropertyType );
  } catch (error) {
    console.error(error);
    // Return error response
    return response.error( res, res.__('messages.errorUpdatingPropertyType'));
  }
};

export const deletePropertyType = async (req, res) => {
  const { id } = req.params;

  // Validate required fields
  if (!id) {
    return response.error( res, res.__('messages.missingRequiredFields') );
  }

  try {
    // Fetch the existing PropertyType to validate the ID
    const existingPropertyType = await prisma.propertyTypes.findUnique({
      where: { id },
    });

    if (!existingPropertyType) {
      return response.error( res, res.__('messages.propertyTypeNotFound') );
    }

    // Print the query before deleting (Ensure UUID is in quotes)
    // console.log(`Query to delete LangTranslation:
    //   DELETE FROM LangTranslations WHERE id = '${existingPropertyType.title}'`);

    // Start a transaction to delete both the PropertyType and its LangTranslations
    const result = await prisma.$transaction(async (prisma) => {
      // Delete the PropertyType record
      await prisma.propertyTypes.delete({
        where: { id },
      });

      // After PropertyType is deleted, now delete the corresponding LangTranslations
      return prisma.langTranslations.delete({
        where: { id: existingPropertyType.title }, // Assuming title is the foreign key to LangTranslations
      });
    });

    // Return success response
    return response.success( res, res.__('messages.propertyTypeDeletedSuccessfully'), result );
  } catch (error) {
    console.error('Error deleting property type:', error); // More detailed logging
    // Return error response
    return response.error( res, res.__('messages.errorDeletingPropertyType'));
  }
};

export const statusUpdatePropertyType = async (req, res) => {
  const {id, status } = req.body;

  try {
      // Step 1: Validate that the status is provided
    if (status === undefined) {
      return await response.error(res, res.__('messages.statusRequired'));
    }

    // Step 2: Check if the project exists
    const existingPropertyType = await prisma.propertyTypes.findUnique({
      where: { id: id },
    });

    if (!existingPropertyType) {
      return await response.error(res, res.__('messages.projectNotFound'));
    }

    // Step 3: Update the project status
    await prisma.propertyTypes.update({
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
        // is_deleted: status === 'inactive',
        property_type_id: id 
      },
    });

      return await response.success(res, res.__('messages.propertyTypeStatusUpdatedSuccessfully'), null);
  } catch (error) {
      console.error('Error statusUpdatePropertyType:', error);
      return await response.serverError(res, res.__('messages.statusUpdatePropertyType'));
  }
};