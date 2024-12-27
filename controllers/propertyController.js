import { PrismaClient } from '@prisma/client';
import response from '../components/utils/response.js';
import { validate as isUUID } from "uuid";
import commonFunction from "../components/utils/commonFunction.js";
const prisma = new PrismaClient();

// Get all property type listing

export const getAgentDeveloperProperty = async (req, res) => {
  try {
    const userInfo = await commonFunction.getLoginUser(req.user.id);

    // Extract pagination and locale from the request
    const { page = 1, limit = 10 } = req.body;
    const lang = res.getLocale();

    // Ensure page and limit are valid numbers
    const validPage = Math.max(1, parseInt(page, 10)); // Default to 1 if invalid
    const validLimit = Math.max(1, parseInt(limit, 10)); // Default to 1 if invalid

    // Calculate the offset (skip) for pagination
    const skip = (validPage - 1) * validLimit;

    // Fetch total count for properties
    
    const whereCondition = (userInfo !== 'admin')?{ user_id: req.user.id }:{};
    const totalCount = await prisma.propertyDetails.count({where: whereCondition});
    console.log(totalCount)
    // Fetch paginated property details
    const properties = await prisma.propertyDetails.findMany({
      skip,
      take: validLimit,
      where: whereCondition,
      orderBy:{
        created_at: 'desc',
      },
      include: {
        users: {
          select: {
            full_name: true,
            image: true,
          },
        },
        lang_translations_property_details_descriptionTolang_translations: {
          select: {
            en_string: true,
            fr_string: true,
          },
        },
        lang_translations: {
          select: {
            en_string: true,
            fr_string: true,
          },
        },
        districts: {
        select: {
            langTranslation: {
            select: {
                en_string: true,
                fr_string: true,
            },
            },
        },
        },
        property_meta_details: {
          select: {
            value: true,
            property_type_listings: {
              select: {
                id: true,
                name: true,
                type: true,
                icon: true,
                key: true,
                lang_translations: {
                  select: {
                    en_string: true,
                    fr_string: true,
                  },
                },
              },
            },
          },
        },
        property_types: {
          select: {
            id: true,
            title: true,
            lang_translations: {
              select: {
                en_string: true,
                fr_string: true,
              },
            },
          },
        },
      },
    });

    // Simplify and process the property details
    const simplifiedProperties = properties.map((property) => {
      const description =
        lang === 'fr'
          ? property.lang_translations_property_details_descriptionTolang_translations.fr_string
          : property.lang_translations_property_details_descriptionTolang_translations.en_string;
      const title =
        lang === 'fr'
          ? property.lang_translations.fr_string
          : property.lang_translations.en_string;
      const type =
        lang === 'fr'
          ? property.property_types?.lang_translations?.fr_string
          : property.property_types?.lang_translations?.en_string;

      const metaDetails = property.property_meta_details.map((meta) => {
        const langObj =
          lang === 'fr'
            ? meta.property_type_listings?.lang_translations?.fr_string
            : meta.property_type_listings?.lang_translations?.en_string;

        return {
          id: meta.property_type_listings?.id || null,
          type: meta.property_type_listings?.type || null,
          key: meta.property_type_listings?.key || null,
          icon: meta.property_type_listings?.icon || null,
          name: langObj,
          value: meta.value,
        };
      });

      const bathRooms =
        metaDetails.find((meta) => meta.key === 'bathrooms')?.value || "0";
      const bedRooms =
        metaDetails.find((meta) => meta.key === 'rooms')?.value || "0";
      const propertyType = res.__('messages.propertyType') + " " + property.transaction;

      return {
        id: property.id,
        user_name: property.users?.full_name || null,
        user_image: property.users?.image || null,
        description,
        title,
        transaction: propertyType,
        transaction_type: property.transaction,
        picture: property.picture,
        video: property.video,
        latitude: property.latitude,
        longitude: property.longitude,
        size: property.size,
        price: property.price,
        created_at: property.created_at,
        bathRooms,
        bedRooms,
        district: property.districts?.name || null,
        meta_details: metaDetails,
        type,
      };
    });

    // Construct the response payload with pagination metadata
    const responsePayload = {
      totalCount,
      totalPages: Math.ceil(totalCount / validLimit),
      currentPage: validPage,
      itemsPerPage: validLimit,
      list: simplifiedProperties,
    };

    // Send response
    return response.success(
      res,
      res.__('messages.propertyFetchSuccessfully'),
      responsePayload
    );
  } catch (error) {
    console.error('Error fetching property details:', error);

    // Return error response
    return response.error(
      res,
      res.__('messages.errorFetchingProperties')
    );
  }
};
export const getAllProperty = async (req, res) => {
  try {

    // Extract pagination and locale from the request
    const { page = 1, limit = 10 } = req.body;
    const lang = res.getLocale();

    // Ensure page and limit are valid numbers
    const validPage = Math.max(1, parseInt(page, 10)); // Default to 1 if invalid
    const validLimit = Math.max(1, parseInt(limit, 10)); // Default to 1 if invalid

    // Calculate the offset (skip) for pagination
    const skip = (validPage - 1) * validLimit;

    // Fetch total count for properties
    
    const totalCount = await prisma.propertyDetails.count();

    // Fetch paginated property details
    const properties = await prisma.propertyDetails.findMany({
      skip,
      take: validLimit,
      orderBy:{
        created_at: 'desc',
      },
      include: {
        users: {
          select: {
            full_name: true,
            image: true,
            email_address:true,
          },
        },
        lang_translations_property_details_descriptionTolang_translations: {
          select: {
            en_string: true,
            fr_string: true,
          },
        },
        lang_translations: {
          select: {
            en_string: true,
            fr_string: true,
          },
        },
        districts: {
        select: {
            langTranslation: {
            select: {
                en_string: true,
                fr_string: true,
            },
            },
        },
        },
        property_meta_details: {
          select: {
            value: true,
            property_type_listings: {
              select: {
                id: true,
                name: true,
                type: true,
                icon: true,
                key: true,
                lang_translations: {
                  select: {
                    en_string: true,
                    fr_string: true,
                  },
                },
              },
            },
          },
        },
        currency: {
          select: {
              name: true,
              symbol: true,
              status: true
          }
        },
        neighborhoods: {
          select: {
              langTranslation: {
              select: {
                  en_string: true,
                  fr_string: true,
              },
              },
          },
          },
        property_types: {
          select: {
            id: true,
            title: true,
            lang_translations: {
              select: {
                en_string: true,
                fr_string: true,
              },
            },
          },
        },
      },
    });

    // Simplify and process the property details
    const simplifiedProperties = properties.map((property) => {
      console.log(property);
      const description =
        lang === 'fr'
          ? property.lang_translations_property_details_descriptionTolang_translations.fr_string
          : property.lang_translations_property_details_descriptionTolang_translations.en_string;
      const title =
        lang === 'fr'
          ? property.lang_translations.fr_string
          : property.lang_translations.en_string;
      const type =
        lang === 'fr'
          ? property.property_types?.lang_translations?.fr_string
          : property.property_types?.lang_translations?.en_string;
      const neighborhood =
        lang === 'fr'
          ? property.neighborhoods?.langTranslation?.fr_string
          : property.neighborhoods?.langTranslation?.en_string;

      const metaDetails = property.property_meta_details.map((meta) => {
        const langObj =
          lang === 'fr'
            ? meta.property_type_listings?.lang_translations?.fr_string
            : meta.property_type_listings?.lang_translations?.en_string;

        return {
          id: meta.property_type_listings?.id || null,
          type: meta.property_type_listings?.type || null,
          key: meta.property_type_listings?.key || null,
          icon: meta.property_type_listings?.icon || null,
          name: langObj,
          value: meta.value,
        };
      });

      const bathRooms =
        metaDetails.find((meta) => meta.key === 'bathrooms')?.value || "0";
      const bedRooms =
        metaDetails.find((meta) => meta.key === 'rooms')?.value || "0";
      const propertyType = res.__('messages.propertyType') + " " + property.transaction;

      return {
        id: property.id,
        user_name: property.users?.full_name || null,
        user_image: property.users?.image || null,
        email_address:property.users?.email_address || null,
        description,
        title,
        transaction: propertyType,
        transaction_type: property.transaction,
        picture: property.picture,
        video: property.video,
        latitude: property.latitude,
        longitude: property.longitude,
        address: property.address,
        size: property.size,
        price: property.price,
        created_at: property.created_at,
        bathRooms,
        bedRooms,
        district: 
        property.districts?.langTranslation &&
        (lang === "fr"
          ? property.districts.langTranslation.fr_string
          : property.districts.langTranslation.en_string),
        images: property.images_data,
        meta_details: metaDetails,
        currency: property.currency?.symbol || null,
        neighborhood,
        type,
      };
    });

    // Construct the response payload with pagination metadata
    const responsePayload = {
      totalCount,
      totalPages: Math.ceil(totalCount / validLimit),
      currentPage: validPage,
      itemsPerPage: validLimit,
      list: simplifiedProperties,
    };

    // Send response
    return response.success(
      res,
      res.__('messages.propertyFetchSuccessfully'),
      responsePayload
    );
  } catch (error) {
    console.error('Error fetching property details:', error);

    // Return error response
    return response.error(
      res,
      res.__('messages.errorFetchingProperties')
    );
  }
};

export const createProperty = async (req, res) => {
    try {
        // Extracting the data from the request body
        const createdBy = req.user.id;
        const {
            title_en,
            title_fr,
            description_en,
            description_fr,
            price,
            currency_id,
            neighborhoods_id,
            district_id,
            city_id,
            state_id,
            latitude,
            longitude,
            address,
            vr_link,
            picture,
            video,
            user_id,
            type_id,
            transaction,
            project_id,
            size,
            meta_details
        } = req.body;

        const user = await prisma.users.findFirst({
          where: {
            id: user_id,
            roles: {
              name: {
                in: ['developer', 'agency'], // Check for either 'developer' or 'agency'
              },
            },
          },
        });
        console.log(user);
        if(!user){
          return response.error(res, res.__('messages.onlyDeveloperAgencyCreat'), null, 400);
        }
        
        const propertyTitleExist = await prisma.propertyDetails.findFirst({
          where: {
            OR: [
              { lang_translations: { en_string: title_en } },
              { lang_translations: { fr_string: title_fr } },
            ],
          },
        })
        
        if(propertyTitleExist){
          return response.error(res, res.__('messages.propertyExists'), null, 400);
        }
        
        // Create lang translations for title and description
        const titleTranslation = await prisma.langTranslations.create({
            data: {
                en_string: title_en,
                fr_string: title_fr,
                created_by: user_id, // Assuming user_id is the ID of the user creating the property
            },
        });

        const descriptionTranslation = await prisma.langTranslations.create({
            data: {
                en_string: description_en,
                fr_string: description_fr,
                created_by: user_id,
            },
        });
        // Create the property
        const newProperty = await prisma.propertyDetails.create({
            data: {
                title: titleTranslation.id, // Linking the title translation
                description: descriptionTranslation.id, // Linking the description translation
                price: price,
                currency_id: currency_id,
                neighborhoods_id: neighborhoods_id,
                district_id: district_id,
                city_id: city_id,
                state_id: state_id,
                latitude: latitude,
                longitude: longitude,
                address: address,
                project_id: project_id || null,
                vr_link: vr_link || null,
                picture: picture || null,
                video: video || null,
                user_id: user_id, // Assuming the user is creating the property
                type: type_id,
                transaction: transaction,
                size: size || null, // Optional, can be null
                created_by:createdBy,
                property_meta_details: {
                    create: meta_details.map((meta) => ({
                        value: meta.value,
                        property_type_id: meta.property_type_id, // Linking to the property type
                    })),
                },
            },
        });

        // Fetch the created property with all necessary relationships for the response
        const createdProperty = await prisma.propertyDetails.findUnique({
            where: { id: newProperty.id },
            include: {
                users: {
                    select: {
                        full_name: true,
                        image: true,
                    },
                },
                lang_translations_property_details_descriptionTolang_translations: {
                    select: {
                        en_string: true,
                        fr_string: true,
                    },
                },
                lang_translations: {
                    select: {
                        en_string: true,
                        fr_string: true,
                    },
                },
                 districts: {
                    select: {
                        langTranslation: {
                        select: {
                            en_string: true,
                            fr_string: true,
                        },
                        },
                    },
                },
                property_meta_details: {
                    select: {
                        value: true,
                        property_type_listings: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                                key: true,
                                lang_translations: {
                                    select: {
                                        en_string: true,
                                        fr_string: true,
                                    },
                                },
                            },
                        },
                    },
                },
                  currency: { // Fetch currency details
                      select: {
                          name: true,
                          symbol: true,
                          status: true,
                      },
                    },
                    neighborhoods: {
                      select: {
                          langTranslation: {
                          select: {
                              en_string: true,
                              fr_string: true,
                          },
                          },
                      },
                  },

                property_types: {
                    select: {
                        id: true,
                        title: true,
                        lang_translations: {
                            select: {
                                en_string: true,
                                fr_string: true,
                            },
                        },
                    },
                },
            },
        });

        // Prepare the property data in the same format as the response of `getAllProperty`
        const lang = res.getLocale();
        const simplifiedProperty = {
            id: createdProperty.id,
            user_name: createdProperty.users?.full_name || null,
            user_image: createdProperty.users?.image || null,
            description: lang === 'fr'
                ? createdProperty.lang_translations_property_details_descriptionTolang_translations.fr_string
                : createdProperty.lang_translations_property_details_descriptionTolang_translations.en_string,
            title: lang === 'fr' ? createdProperty.lang_translations.fr_string : createdProperty.lang_translations.en_string,
            transaction: `${res.__('messages.propertyType')} ${createdProperty.transaction}`,
            transaction_type: createdProperty.transaction,
            latitude: createdProperty.latitude,
            longitude: createdProperty.longitude,
            address: createdProperty.address,
            size: createdProperty.size,
            price: createdProperty.price,
            picture: createdProperty.picture,
            bathRooms: createdProperty.property_meta_details.find((meta) => meta.property_type_listings.key === 'bathrooms')?.value || "0",
            bedRooms: createdProperty.property_meta_details.find((meta) => meta.property_type_listings.key === 'rooms')?.value || "0",
            district: createdProperty.districts?.langTranslation
                ? lang === 'fr'
                ? createdProperty.districts.langTranslation.fr_string
                : createdProperty.districts.langTranslation.en_string
                : null,
            meta_details: createdProperty.property_meta_details.map((meta) => {
                const langObj = lang === 'en'
                    ? meta.property_type_listings?.lang_translations?.en_string
                    : meta.property_type_listings?.lang_translations?.fr_string;

                return {
                    id: meta.property_type_listings?.id || null,
                    type: meta.property_type_listings?.type || null,
                    key: meta.property_type_listings?.key || null,
                    name: langObj,
                    value: meta.value,
                };
            }),
            type: lang === 'fr'
                ? createdProperty.property_types?.lang_translations?.fr_string
                : createdProperty.property_types?.lang_translations?.en_string,
                
            // currency_details: createdProperty.currency?{
            //     name: createdProperty.currency.name,
            //     symbol: createdProperty.currency.symbol,
            //     status: createdProperty.currency.status,
            // }
            // : null,

            currency: createdProperty.currency
            ? createdProperty.currency.symbol
            : null,


            neighborhood: createdProperty.neighborhoods?.langTranslation
                ? lang === 'fr'
                ? createdProperty.neighborhoods.langTranslation.fr_string
                : createdProperty.neighborhoods.langTranslation.en_string
                : null,



            // neighborhood_details: createdProperty.neighborhoods?{
            //     district_id: createdProperty.neighborhoods.district_id,
            //     lang_id: createdProperty.neighborhoods.lang_id,
            //     latitude: createdProperty.neighborhoods.latitude,
            //     longitude: createdProperty.neighborhoods.longitude,
            //     created_at: createdProperty.neighborhoods.created_at,
            //     updated_at: createdProperty.neighborhoods.updated_at,
            // }
            // : null,
        };

        // Return the response with the created property data
        return await response.success(res, res.__('messages.propertyCreatedSuccessfully'), simplifiedProperty);
    } catch (error) {
        console.error('Error creating property:', error);
        return await response.serverError(res, res.__('messages.errorCreatingProperty'));
    }
};

export const updateProperty = async (req, res) => {
  const updatedBy = req.user.id;
  const {
    propertyId, // ID of the property to update
    title_en,
    title_fr,
    description_en,
    description_fr,
    price,
    currency_id,
    neighborhoods_id,
    district_id,
    latitude,
    longitude,
    address,
    vr_link,
    picture,
    video,
    user_id,
    type_id,
    transaction,
    size,
    meta_details,
  } = req.body;

  try {
    // Validate propertyId
    if (!propertyId || !isUUID(propertyId)) {
      return await response.error(res, res.__('messages.invalidPropertyId'));
    }

    // Check if property exists
    const existingProperty = await prisma.propertyDetails.findUnique({
      where: { id: propertyId },
    });

    if (!existingProperty) {
      return await response.error(res, res.__('messages.propertyNotFound'));
    }

    // Update title translations if provided
    if (title_en || title_fr) {
      await prisma.langTranslations.update({
        where: { id: existingProperty.title },
        data: {
          en_string: title_en || existingProperty.title_en,
          fr_string: title_fr || existingProperty.title_fr,
          updated_by: user_id,
        },
      });
    }

    // Update description translations if provided
    if (description_en || description_fr) {
      await prisma.langTranslations.update({
        where: { id: existingProperty.description },
        data: {
          en_string: description_en || existingProperty.description_en,
          fr_string: description_fr || existingProperty.description_fr,
          updated_by: user_id,
        },
      });
    }

    // Validate district_id if provided
    if (district_id && !isUUID(district_id)) {
      return await response.error(res, res.__('messages.invalidDistrictId'));
    }

    const updateData = {
      price: price !== undefined ? price : existingProperty.price,
      district_id: district_id !== undefined ? district_id : existingProperty.district_id,
      latitude: latitude !== undefined ? latitude : existingProperty.latitude,
      address: address !== undefined ? address : existingProperty.address,
      currency_id: currency_id !== undefined ? currency_id : existingProperty.currency_id,
      neighborhoods_id: neighborhoods_id !== undefined ? neighborhoods_id : existingProperty.neighborhoods_id,
      longitude: longitude !== undefined ? longitude : existingProperty.longitude,
      vr_link: vr_link !== undefined ? vr_link : existingProperty.vr_link,
      picture: picture !== undefined ? picture : existingProperty.picture,
      video: video !== undefined ? video : existingProperty.video,
      user_id,
      type: type_id !== undefined ? type_id : existingProperty.type,
      transaction: transaction !== undefined ? transaction : existingProperty.transaction,
      size: size !== undefined ? size : existingProperty.size,
      updated_by:updatedBy
    };

  console.log(updateData,"updateData")
    // Update property details
    const updatedProperty = await prisma.propertyDetails.update({
      where: { id: propertyId },
      data: 
        updateData
    });

    // Update meta details: delete existing and recreate
    if (meta_details && meta_details.length > 0) {
      await prisma.propertyMetaDetails.deleteMany({
        where: { property_detail_id: propertyId },
      });

      await prisma.propertyMetaDetails.createMany({
        data: meta_details.map((meta) => ({
          property_detail_id: propertyId,
          value: meta.value,
          property_type_id: meta.property_type_id,
        })),
      });
    }

    // Fetch the updated property with relationships
    const updatedPropertyDetails = await prisma.propertyDetails.findUnique({
      where: { id: updatedProperty.id },
      include: {
        users: {
          select: { full_name: true, image: true },
        },
        lang_translations_property_details_descriptionTolang_translations: {
          select: { en_string: true, fr_string: true },
        },
        lang_translations: {
          select: { en_string: true, fr_string: true },
        },
        districts: {
          select: {
            langTranslation: {
              select: { en_string: true, fr_string: true },
            },
          },
        },
        neighborhoods: {
          select: {
            langTranslation: {
              select: { en_string: true, fr_string: true },
            },
          },
        },
        currency: { // Fetch currency details
          select: {
              name: true,
              symbol: true,
              status: true,
          },
        },
        property_meta_details: {
          select: {
            value: true,
            property_type_listings: {
              select: {
                id: true,
                name: true,
                type: true,
                key: true,
                lang_translations: {
                  select: { en_string: true, fr_string: true },
                },
              },
            },
          },
        },
        property_types: {
          select: {
            id: true,
            title: true,
            lang_translations: {
              select: { en_string: true, fr_string: true },
            },
          },
        },
      },
    });

    console.log(updatedPropertyDetails,"updatedPropertyDetails")
    // Prepare the response
    const lang = res.getLocale();
    const simplifiedProperty = {
      id: updatedPropertyDetails.id,
      user_name: updatedPropertyDetails.users?.full_name || null,
      user_image: updatedPropertyDetails.users?.image || null,
      description:
        lang === "fr"
          ? updatedPropertyDetails.lang_translations_property_details_descriptionTolang_translations.fr_string
          : updatedPropertyDetails.lang_translations_property_details_descriptionTolang_translations.en_string,
      title:
        lang === "fr"
          ? updatedPropertyDetails.lang_translations.fr_string
          : updatedPropertyDetails.lang_translations.en_string,
      transaction: `${res.__("messages.propertyType")} ${updatedPropertyDetails.transaction}`,
      transaction_type: updatedPropertyDetails.transaction,
      latitude: updatedPropertyDetails.latitude,
      longitude: updatedPropertyDetails.longitude,
      address: updatedPropertyDetails.address,
      size: updatedPropertyDetails.size,
      price: updatedPropertyDetails.price,
      currency: updatedPropertyDetails.currency.symbol,
      bathRooms:
        updatedPropertyDetails.property_meta_details.find(
          (meta) => meta.property_type_listings.key === "bathrooms"
        )?.value || 0,
      bedRooms:
        updatedPropertyDetails.property_meta_details.find(
          (meta) => meta.property_type_listings.key === "rooms"
        )?.value || 0,
      district:
        updatedPropertyDetails.districts?.langTranslation &&
        (lang === "fr"
          ? updatedPropertyDetails.districts.langTranslation.fr_string
          : updatedPropertyDetails.districts.langTranslation.en_string),
      neighborhood:
        updatedPropertyDetails.neighborhoods?.langTranslation &&
        (lang === "fr"
          ? updatedPropertyDetails.neighborhoods.langTranslation.fr_string
          : updatedPropertyDetails.neighborhoods.langTranslation.en_string),
      meta_details: updatedPropertyDetails.property_meta_details.map((meta) => ({
        id: meta.property_type_listings?.id || null,
        type: meta.property_type_listings?.type || null,
        key: meta.property_type_listings?.key || null,
        name:
          lang === "en"
            ? meta.property_type_listings?.lang_translations?.en_string
            : meta.property_type_listings?.lang_translations?.fr_string,
        value: meta.value,
      })),
      type:
        lang === "fr"
          ? updatedPropertyDetails.property_types?.lang_translations?.fr_string
          : updatedPropertyDetails.property_types?.lang_translations?.en_string,
    };

    return await response.success(res, res.__('messages.propertyUpdatedSuccessfully'), simplifiedProperty);
  } catch (error) {
    console.error("Error updating property:", error);
    return await response.serverError(res, res.__('messages.errorUpdatingProperty'));
  }
};


export const deleteProperty = async (req, res) => {
    const { propertyId } = req.params;

    try {
        if (!propertyId) {
            return await response.error(res, res.__('messages.propertyIdRequired'));
        }

        const existingProperty = await prisma.propertyDetails.findUnique({
            where: { id: propertyId },
        });

        if (!existingProperty) {
          return await response.error(res, res.__('messages.propertyNotFound'));
        }

        // Corrected deleteMany call with the proper field
        await prisma.propertyMetaDetails.deleteMany({
            where: { property_detail_id: propertyId }, // Adjusted field name
        });

        // Delete the property
        await prisma.propertyDetails.delete({
            where: { id: propertyId },
        });

        return await response.success(res, res.__('messages.propertyDeletedSuccessfully'), null);
    } catch (error) {
        console.error('Error deleting property:', error);
        return await response.serverError(res, res.__('messages.errorDeletingProperty'));
    }
};


export const statusUpdateProperty = async (req, res) => {
  const {id, status } = req.body;

  try {
      // Step 1: Validate that the status is provided
    if (status === undefined) {
      return await response.error(res, res.__('messages.statusRequired'));
    }

    // Step 2: Check if the project exists
    const existingPropery = await prisma.propertyDetails.findUnique({
      where: { id: id },
    });

    if (!existingPropery) {
      return await response.error(res, res.__('messages.projectNotFound'));
    }

    // Step 3: Update the project status
    await prisma.propertyDetails.update({
      where: { id: id },
      data: {
        status: status, // Update status field of the project
      },
    });

    // Step 4: Update project_meta_details if needed (e.g., for status or related info)
    await prisma.propertyMetaDetails.updateMany({
      where: { property_detail_id: id }, // Ensure you update the related meta details
      data: {
        // Add any updates you need to perform on the meta details
        // status: status, // Example: update the status on meta details as well
        // is_deleted: status === 'inactive',
        property_detail_id: id 
      },
    });

      return await response.success(res, res.__('messages.propertyUpdatedSuccessfully'), null);
  } catch (error) {
      console.error('Error statusUpdate property:', error);
      return await response.serverError(res, res.__('messages.errorstatusUpdateProperty'));
  }
};