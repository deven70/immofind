import { PrismaClient } from '@prisma/client';
import response from "../components/utils/response.js";
import { validate as isUuid } from 'uuid';

// Initialize Prisma Client
const prisma = new PrismaClient();
// Create District
export const createDistrict = async (req, res) => {
  try {
    const {
      city_id,
      en_name,
      fr_name,
      latitude,
      longitude,
    } = req.body;

    // Validate required fields
    if (!city_id || (!en_name && !fr_name)) {
      return response.error(
        res,
        res.__('messages.fieldError', { field: 'city_id, en_name, or fr_name' })
      );
    }

    // Validate `city_id` format
    if (!isUuid(city_id)) {
      return response.error(
        res,
        res.__('messages.invalidCityIdFormat') // Error if city_id is not a valid UUID
      );
    }

    // Verify `city_id` exists in Cities table
    const cityExists = await prisma.cities.findUnique({
      where: { id: city_id },
    });

    if (!cityExists) {
      return response.error(
        res,
        res.__('messages.invalidCityId') // Error if city_id does not exist
      );
    }

    // Check if a language translation exists for the given names
    let langTranslation = await prisma.langTranslations.findFirst({
      where: {
        OR: [
          { en_string: en_name },
          { fr_string: fr_name },
        ],
      },
    });

    // If no existing translation, create a new one
    if (!langTranslation) {
      langTranslation = await prisma.langTranslations.create({
        data: {
          en_string: en_name,
          fr_string: fr_name,
        },
      });
    }

    // Check if a district with the same city_id and lang_id already exists
    const existingDistrict = await prisma.districts.findFirst({
      where: {
        city_id,
        lang_id: langTranslation.id,
      },
    });

    if (existingDistrict) {
      return response.error(
        res,
        res.__('messages.districtAlreadyExists') // Error if district already exists
      );
    }

    // Create the district if it doesn't exist
    const district = await prisma.districts.create({
      data: {
        city_id,
        lang_id: langTranslation.id, // Use the generated or existing lang_id
        latitude,
        longitude,
      },
    });

    return response.success(
      res,
      res.__('messages.districtCreatedSuccessfully'), // Success message
      district
    );
  } catch (error) {
    console.error('Error creating district:', error);
    return response.error(
      res,
      res.__('messages.internalServerError'),
      { message: error.message }
    );
  }
};


// Get Districts by City
export const getDistrictsByCity = async (req, res) => {
  try {
    const { city_id, lang } = req.body; // Extract city_id and lang from the request body

 // Validate city_id presence
    if (!city_id) {
      return response.error(
        res,
        res.__('messages.cityIdRequired')
      ); // Error if city_id is missing
    }

    // Validate city_id format
    if (!isUuid(city_id)) {
      return response.error(
        res,
        res.__('messages.invalidCityIdFormat') // Error if city_id is not a valid UUID
      );
    }
    // Verify if city_id exists
    const cityExists = await prisma.cities.findUnique({
      where: { id: city_id },
    });

    if (!cityExists) {
      return response.error(
        res,
        res.__('messages.invalidCityId') // Error if city_id does not exist
      );
    }
    const isFrench = lang === 'fr'; // Determine if the language is French

    // Fetch districts by city_id with language-specific translations
    const districts = await prisma.districts.findMany({
      where: { city_id },
      select: {
        id: true,
        langTranslation: {
          select: {
            fr_string: isFrench,
            en_string: !isFrench,
          },
        },
        latitude: true,
        longitude: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Check if districts are found
    if (!districts || districts.length === 0) {
      return response.error(res, res.__('messages.noDistrictsFoundForCity')); // No districts found
    }

    // Transform the response to include only the relevant language string
    const transformedDistricts = districts.map((district) => ({
      id: district.id,
      name: district.name,
      name: district.langTranslation?.fr_string || district.langTranslation?.en_string,
      latitude: district.latitude,
      longitude: district.longitude,
      slug: district.slug,
      created_at: district.created_at,
      updated_at: district.updated_at,
    }));

    // Return success response with transformed data
    return response.success(
      res,
      res.__('messages.districtsFetchedSuccessfully'),
      transformedDistricts
    );
  } catch (error) {
    console.error('Error fetching districts:', error);
    return response.error(res, res.__('messages.internalServerError'), {
      message: error.message,
      stack: error.stack,
    }); // Return server error
  }
};



// Get District by ID
export const getDistrictById = async (req, res) => {
  try {
    const { id, lang } = req.body; // Extract id and lang from the request body

    // Validate ID
    if (!id) {
      return response.error(res, res.__('messages.districtIdRequired')); // Error if id is missing
    }
  // Validate city_id format
    if (!isUuid(id)) {
      return response.error(
        res,
        res.__('messages.invalidCityIdFormat') // Error if city_id is not a valid UUID
      );
    }

    // Verify if city_id exists
    // const cityExists = await prisma.cities.findUnique({
    //   where: { id: id },
    // });

    // if (!cityExists) {
    //   return response.error(
    //     res,
    //     res.__('messages.invalidCityId') // Error if city_id does not exist
    //   );
    // }
    const isFrench = lang === 'fr'; // Determine if the language is French

    // Fetch district by ID with language-specific translations
    const district = await prisma.districts.findUnique({
      where: { id: id },
      select: {
        id: true,
        langTranslation: {
          select: {
            fr_string: isFrench,
            en_string: !isFrench,
          },
        },
        latitude: true,
        longitude: true,
        created_at: true,
        updated_at: true,
      },
    });
    if (!district) {
      return response.error(res, res.__('messages.districtNotFound')); // Error if not found
    }

    // Transform response to include only the relevant language string
    const transformedDistrict = {
      id: district.id,
      name: district.langTranslation?.fr_string || district.langTranslation?.en_string,
      latitude: district.latitude,
      longitude: district.longitude,
      created_at: district.created_at,
      updated_at: district.updated_at,
    };

    return response.success(res, res.__('messages.districtFetchedSuccessfully'), transformedDistrict); // Success message
  } catch (error) {
    console.error('Error fetching district:', error);
    return response.error(res, res.__('messages.internalServerError'), { message: error.message }); // Server error
  }
};


// Update District
export const updateDistrict = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, en_name, fr_name, city_id, lang_id, slug, latitude, longitude } = req.body;

    // Validate ID
    if (!id) {
      return await response.error(res, res.__('messages.districtIdRequired')); // Error if id is missing
    }

    // Update district
    const district = await prisma.districts.update({
      where: { id },
      data: {
        name,
        en_name,
        fr_name,
        city_id,
        lang_id,
        slug,
        latitude,
        longitude,
      },
    });

    return await response.success(res, res.__('messages.districtUpdatedSuccessfully'), district); // Success message
  } catch (error) {
    return await response.error(res, res.__('messages.internalServerError'), { message: error.message }); // Server error
  }
};

// Delete District
export const deleteDistrict = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return await response.error(res, res.__('messages.districtIdRequired')); // Error if id is missing
    }

    // Soft delete district
    const district = await prisma.districts.update({
      where: { id },
      data: { is_deleted: true },
    });

    return await response.success(res, res.__('messages.districtDeletedSuccessfully'), district); // Success message
  } catch (error) {
    return await response.error(res, res.__('messages.internalServerError'), { message: error.message }); // Server error
  }
};
