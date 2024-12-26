import { PrismaClient } from '@prisma/client';
import response from "../components/utils/response.js";
import { validate as isUuid } from 'uuid';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Create Neighborhood
export const createNeighborhood = async (req, res) => {
  try {
    const { district_id, en_name, fr_name, latitude, longitude, lang } = req.body;

    // Validate required fields
    if (!district_id || (!en_name && !fr_name)) {
      return response.error(
        res,
        res.__('messages.fieldError', { field: 'district_id, en_name, or fr_name' })
      );
    }

    // Validate `district_id` format
    if (!isUuid(district_id)) {
      return response.error(
        res,
        res.__('messages.invalidDistrictIdFormat') // Error if district_id is not a valid UUID
      );
    }

    // Verify `district_id` exists in Districts table
    const districtExists = await prisma.districts.findUnique({
      where: { id: district_id },
    });

    if (!districtExists) {
      return response.error(
        res,
        res.__('messages.invalidDistrictId') // Error if district_id does not exist
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

    // Create the neighborhood
    const neighborhood = await prisma.neighborhoods.create({
      data: {
        district_id,
        lang_id: langTranslation.id, // Use the generated or existing lang_id
        latitude,
        longitude,
      },
    });

    // Fetch the neighborhood with the translated names based on the requested language
    const createdNeighborhood = await prisma.neighborhoods.findUnique({
      where: { id: neighborhood.id },
      include: {
        langTranslation: true, // Include langTranslation data to fetch the actual name
      },
    });

    // Prepare the response based on the selected language
    let neighborhoodName;
    if (lang === 'en') {
      neighborhoodName = createdNeighborhood.langTranslation.en_string;
    } else if (lang === 'fr') {
      neighborhoodName = createdNeighborhood.langTranslation.fr_string;
    } else {
      return response.error(res, res.__('messages.invalidLanguage')); // Error if language is invalid
    }

    return response.success(
      res,
      res.__('messages.neighborhoodCreatedSuccessfully'),
      {
        id: createdNeighborhood.id,
        district_id: createdNeighborhood.district_id,
        neighborhood_name: neighborhoodName, // Return the correct name based on the language
        latitude: createdNeighborhood.latitude,
        longitude: createdNeighborhood.longitude,
        is_deleted: createdNeighborhood.is_deleted,
        created_at: createdNeighborhood.created_at,
        updated_at: createdNeighborhood.updated_at,
        created_by: createdNeighborhood.created_by,
        updated_by: createdNeighborhood.updated_by
      }
    );

    // return response.success(
    //   res,
    //   res.__('messages.neighborhoodCreatedSuccessfully'),
    //   neighborhood
    // );
  } catch (error) {
    console.error('Error creating neighborhood:', error);
    return response.error(
      res,
      res.__('messages.internalServerError'),
      { message: error.message }
    );
  }
};

// Get Neighborhoods by District
export const getNeighborhoodsByDistrict = async (req, res) => {
  try {
    const { district_id, lang } = req.body;

    // Validate district_id
    if (!district_id) {
      return response.error(
        res,
        res.__('messages.districtIdRequired')
      );
    }

    if (!isUuid(district_id)) {
      return response.error(
        res,
        res.__('messages.invalidDistrictIdFormat')
      );
    }

    // Verify if district_id exists
    const districtExists = await prisma.districts.findUnique({
      where: { id: district_id },
    });

    if (!districtExists) {
      return response.error(
        res,
        res.__('messages.invalidDistrictId')
      );
    }

    const isFrench = lang === 'fr';

    // Fetch neighborhoods by district_id
    const neighborhoods = await prisma.neighborhoods.findMany({
      where: { district_id },
      select: {
        id: true,
        langTranslation: {
          select: {
            fr_string: true,
            en_string: true,
          },
        },
        latitude: true,
        longitude: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!neighborhoods.length) {
      return response.error(res, res.__('messages.noNeighborhoodsFoundForDistrict'));
    }

    const transformedNeighborhoods = neighborhoods.map((neighborhood) => ({
      id: neighborhood.id,
      name: lang === 'fr'
        ? neighborhood.langTranslation?.fr_string
        : neighborhood.langTranslation?.en_string,
      latitude: neighborhood.latitude,
      longitude: neighborhood.longitude,
      created_at: neighborhood.created_at,
      updated_at: neighborhood.updated_at,
    }));

    return response.success(
      res,
      res.__('messages.neighborhoodsFetchedSuccessfully'),
      transformedNeighborhoods
    );
  } catch (error) {
    console.error('Error fetching neighborhoods:', error);
    return response.error(
      res,
      res.__('messages.internalServerError'),
      { message: error.message }
    );
  }
};

// Get Neighborhood by ID
export const getNeighborhoodById = async (req, res) => {
  try {
    const { id, lang } = req.body;

    // Validate ID
    if (!id) {
      return response.error(res, res.__('messages.neighborhoodIdRequired'));
    }

    if (!isUuid(id)) {
      return response.error(
        res,
        res.__('messages.invalidNeighborhoodIdFormat')
      );
    }

    const isFrench = lang === 'fr';

    // Fetch neighborhood by ID
    const neighborhood = await prisma.neighborhoods.findUnique({
      where: { id },
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

    if (!neighborhood) {
      return response.error(res, res.__('messages.neighborhoodNotFound'));
    }

    const transformedNeighborhood = {
      id: neighborhood.id,
      name: neighborhood.langTranslation?.fr_string || neighborhood.langTranslation?.en_string,
      latitude: neighborhood.latitude,
      longitude: neighborhood.longitude,
      created_at: neighborhood.created_at,
      updated_at: neighborhood.updated_at,
    };

    return response.success(res, res.__('messages.neighborhoodFetchedSuccessfully'), transformedNeighborhood);
  } catch (error) {
    console.error('Error fetching neighborhood:', error);
    return response.error(res, res.__('messages.internalServerError'), { message: error.message });
  }
};

// Update Neighborhood
export const updateNeighborhood = async (req, res) => {
  try {
    const { id } = req.params;
    const { en_name, fr_name, latitude, longitude, lang } = req.body;

    if (!id) {
      return response.error(res, res.__('messages.neighborhoodIdRequired'));
    }

    // Fetch the existing neighborhood with lang_id
    const neighborhood = await prisma.neighborhoods.findUnique({
      where: { id },
      select: {
        lang_id: true, // Fetch lang_id for language updates
      },
    });

    if (!neighborhood) {
      return response.error(res, res.__('messages.neighborhoodNotFound'));
    }

    // Update language translations
    await prisma.langTranslations.update({
      where: { id: neighborhood.lang_id },
      data: {
        en_string: en_name,
        fr_string: fr_name,
      },
    });

    // Update neighborhood details
    const updatedNeighborhood = await prisma.neighborhoods.update({
      where: { id },
      data: {
        latitude,
        longitude,
      },
      include: {
        langTranslation: true, // Include language translations in response
      },
    });

    // Determine which name to show based on language
    const name =
      lang === 'fr'
        ? updatedNeighborhood.langTranslation.fr_string
        : updatedNeighborhood.langTranslation.en_string;

    // Prepare response object
    const responseData = {
      id: updatedNeighborhood.id,
      district_id: updatedNeighborhood.district_id,
      name, // Include name instead of lang_id
      latitude: updatedNeighborhood.latitude,
      longitude: updatedNeighborhood.longitude,
      is_deleted: updatedNeighborhood.is_deleted,
      created_at: updatedNeighborhood.created_at,
      updated_at: updatedNeighborhood.updated_at,
    };

    return response.success(res, res.__('messages.neighborhoodUpdatedSuccessfully'), responseData);
  } catch (error) {
    console.error('Error updating neighborhood:', error);
    return response.error(res, res.__('messages.internalServerError'), { message: error.message });
  }
};

// Delete Neighborhood
export const deleteNeighborhood = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return response.error(res, res.__('messages.neighborhoodIdRequired'));
    }

    const deletedNeighborhood = await prisma.neighborhoods.update({
      where: { id },
      data: { is_deleted: true },
    });

    return response.success(res, res.__('messages.neighborhoodDeletedSuccessfully'), deletedNeighborhood);
  } catch (error) {
    console.error('Error deleting neighborhood:', error);
    return response.error(res, res.__('messages.internalServerError'), { message: error.message });
  }
};
