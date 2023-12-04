const globalServices = require("../../services/index");
const moment = require("moment");
const models = require("../../model");
const mongoose = require("mongoose");
const { mode } = require("crypto-js");
module.exports = {


  createBusiness: async (req, res) => {
    const { user } = req;
    const userId = user._id.toString();
    let payLoad = req.body;
    let userRole = user.role;


    try {

      if (payLoad.startDateTime > payLoad.endDateTime) {
        return globalServices.global.returnResponse(
          res,
          400,
          true,
          "start date & time must be less than from end date & time",
          {}
        );
      }
      
      if (!user.isVerified) {
        return globalServices.global.returnResponse(
          res,
          401,
          true,
          "You are not verified yet! Please verify your OTP",
          {}
        );
      }

        Object.assign(payLoad, {
          userId: userId,
        });
        const allDays = globalServices.partner.hasAllDaysOfWeek(payLoad.businessWeek);
        // const timeDuration =  globalServices.event.hasMinimumDurationforArray(payLoad.businessWeek);

        // if(timeDuration.length != 0){
        //   return globalServices.global.returnResponse(
        //     res,
        //     400,
        //     true,
        //     "Time must be has at least 5 hours difference",
        //     {timeDuration}
        //   );
        // }
      
        if (!allDays) {
          return globalServices.global.returnResponse(
            res,
            400,
            false,
            "The business Week must include all seven days of the week.",
            {}
          );
        }
      
        var result = await globalServices.partner.partnerCreation(payLoad);
        if (result) {
          return  globalServices.global.returnResponse(
            res,
            200,
            false,
            'Your bussiness request successfully submitted.please Wait for admin approval',
            result
          );
        }
      
      return globalServices.global.returnResponse(
        res,
        404,
        true,
        "User not found!",
        {}
      );



    } catch (err) {
      res.status(500).json(err);
    }
  },

 getBusinessList: async (req, res) => {
    try {
      let { user } = req;
      let userId = user._id.toString();
      let { limit, page } = req.query;
      let { distance } = req.query;
      const validbusinessType = [ "bar" , "club"];
      const validBussinessStatuses = ["approved", "pending", "rejected"];
      const validBusinessState = [ "open", "close", ]

      let {
        price_range,
        search,
        maxParticipants,
        businessCategory,
        longitude,
        latitude,
        bussinessStatus,
        businessState
      } = req.query;

      let { searchBusiness } = req.query;

      limit = limit ? limit : 5;
      page = page ? page : 1;
      const queryLimit = parseInt(limit);

      const searchQuery = searchBusiness || '';

      /// map filter ///////////

      if (distance && !longitude && !latitude) {
        res.status(400).send({
          error: true,
          status: 400,
          msg: "Missing Longitude and Latitude",
        });
        return;
      }


const distanceInMeters = Number(distance) * 1000; // Convert distance to a number in meters
const coordinates = [Number(longitude), Number(latitude)]; // Convert longitude and latitude to numbers

const mapTrainings = distanceInMeters
  ? {
      location: {
        $geoWithin: {
          $centerSphere: [coordinates, distanceInMeters / 6371],
        },
      },
    }
  : {};

      const queryFilter = {};

      if (searchQuery && searchQuery !== '') {
     queryFilter.$or = [
          {
            bussinessName: {
              $regex: searchQuery,
              $options: 'i',
            },
          },
          {
            place: {
              $regex: searchQuery,
              $options: 'i',
            },
          },
        ];


      }
    console.log(("queryFilter") + JSON.stringify(queryFilter, null, 2));



      ///// price_range filter /////////
      let priceObj = price_range || "";
      if (priceObj) {
        priceObj = JSON.parse(price_range);
      }

      const priceFilter =
        priceObj && priceObj !== ""
          ? {
              $or: [
                {
                  "admissionFee.male.amount": {
                    $gte: priceObj.min,
                    $lte: priceObj.max,
                  },
                },
                {
                  "admissionFee.female.amount": {
                    $gte: priceObj.min,
                    $lte: priceObj.max,
                  },
                },
              ],
            }
          : {};

      ///// businessCategory filter /////////
    
      const businessFilter =
      businessCategory &&
      businessCategory !== "" &&
      validbusinessType.includes(businessCategory)
        ? {
          bussinessCategory: businessCategory,
          }
        : {};
      let result;

      console.log("businessCategory" + businessCategory)

      console.log("result" + result )

      const isApprovedBussiness =
  bussinessStatus &&
  bussinessStatus !== "" &&
  validBussinessStatuses.includes(bussinessStatus)
    ? {
        bussinessStatus: bussinessStatus,
      }
    : {};

    const isopen =
    businessState &&
    businessState !== "" &&
    validBusinessState.includes(businessState)
    ? {
      businessState: businessState,
      }
    : {};

  result = await models.partner.aggregate([
    {
      $match: {
        ...businessFilter,
        ...priceFilter,
        ...mapTrainings,
        ...queryFilter,
        ...isApprovedBussiness,
        ...isopen
      },

    },
    { $skip: limit * page - queryLimit },
    { $limit: queryLimit },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "vipcards",
        localField: "_id",
        foreignField: "eventId",
        pipeline: [{ $project: { cards: 1, userId, _id: 0 } }],
        as: "vips",
      },
    },
    { $unwind: { path: "$vips", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        pipeline: [
          {
            $lookup: {
              from: "userprofiles",
              localField: "_id",
              foreignField: "userId",
              as: "profile",
            },
          },
          {
            $unwind: { path: "$profile", preserveNullAndEmptyArrays: true },
          },
          {
            $project: {
              profile: {
                profileImage: "$profile.profileImage",
                description: "$profile.description",
                age: "$profile.age",
                gender: "$profile.gender",
                phoneNumber: "$profile.phoneNumber",
                location: "$profile.location",
                hobbies: "$profile.hobbies",
                interests: "$profile.interests",
                isPrivate: "$profile.isPrivate",
                phoneCode: "$profile.phoneCode",
                joinedEvents: "$profile.joinedEvents",
              },
              username: 1,
              email: 1,
              _id: 1,
            },
          },
        ],
        as: "userDetail",
      },
    },
    { $unwind: { path: "$userDetail", preserveNullAndEmptyArrays: true } },
  ]);


      if (result) {
        globalServices.global.returnResponse(
          res,
          200,
          false,
          "Business list!",
          result
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "Business not found!",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getBusinessDetails: async (req, res) => {
    try {
      let { user } = req;
      let userId = user._id.toString();

      let { businessId } = req.body;
       
      const currentDate = new Date();

      if(!businessId){
        return  globalServices.global.returnResponse(
          res,
          400,
          true,
          "business Id is required",
          {}
        );
      }


      var formatedDate = await globalServices.event.formatDateToISO(currentDate);

      // const reservedData = await models.subscription.findOne({
      //   userId: userId,
      //   eventId: businessId,
      //   expirationDate: { $gt: formatedDate  }
      // });

      // let ispurchased = (reservedData) ? true : false

      const business =  await models.partner.findOne({ _id : businessId });

      if (business) {

        let eventDetails =    await models.partner.aggregate([
          { $match: 
            { 
            _id: mongoose.Types.ObjectId(businessId)
          }
         },
          {
            $lookup: {
              from: "vipcards",
              localField: "_id",
              foreignField: "eventId",
              pipeline: [{ $project: { cards: 1, userId: 1, _id: 0 } }],
              as: "vips",
            },
          },
          { $unwind: { path: "$vips", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              pipeline: [
                {
                  $lookup: {
                    from: "userprofiles",
                    localField: "_id",
                    foreignField: "userId",
                    as: "profile",
                  },
                },
                {
                  $unwind: {
                    path: "$profile",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    profile: {
                      profileImage: "$profile.profileImage",
                      description: "$profile.description",
                      age: "$profile.age",
                      gender: "$profile.gender",
                      phoneNumber: "$profile.phoneNumber",
                      location: "$profile.location",
                      hobbies: "$profile.hobbies",
                      interests: "$profile.interests",
                      isPrivate: "$profile.isPrivate",
                      phoneCode: "$profile.phoneCode",
                    },
                    username: 1,
                    email: 1,
                    _id: 1,
                  },
                },
              ],
              as: "userDetail",
            },
          },
          {
            $unwind: { path: "$userDetail", preserveNullAndEmptyArrays: true },
          },
          // {
          //   $project: {
          //     vips: 1,
          //     userDetail: 1,
          //   },
          // },
        ]) ;

        let count = await globalServices.partner.getMaleFemaleParticipantCount(businessId)

        let participantCount =  {
          totalCount : count.maleCount + count.femaleCount,
          maleCount : count.maleCount,
          femaleCount : count.femaleCount
         }



        const getFirstObject = eventDetails[0]
        const mergedObject = { ...getFirstObject, ...participantCount};
        globalServices.global.returnResponse(
          res,
          200,
          false,
          "business Detail!",
          mergedObject
        );
      } else {
        globalServices.global.returnResponse(
          res,
          400,
          true,
          "No business with that Id found",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  updateUserBusiness : async (req, res) => {
    try {
      let payLoad = req.body;

      let { businessId  } = req.params;

      let { user } = req;
      let userId = user._id.toString();

      if(!businessId){
        return  globalServices.global.returnResponse(
          res,
          403,
          true,
          "bussiness Id is required",
          {}
        );
      }

      let business = await models.partner.findOne({
        _id: businessId,
        $and: [{ userId: userId }],
      });

      if (business && business.businessState === "close") {
        let result = await globalServices.partner.updateBusiness(businessId, payLoad);

        if (result) {
          globalServices.global.returnResponse(
            res,
            200,
            false,
            "Event updated successfully!",
            result
          );
        } else {
          globalServices.global.returnResponse(
            res,
            401,
            true,
            "Failed to update Event!",
            {}
          );
        }
      } else if (business && business.businessState === "open") {
        globalServices.global.returnResponse(
          res,
          400,
          true,
          "Business state is Open so please close it first to Update",
          {}
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "Business not found against this detail you provide!",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getMyBusiness: async (req, res) => {
    try {
      let { user } = req;
      const userId = user._id
      let { limit, page } = req.query;

      limit = limit ? limit : 5;
      page = page ? page : 1;
      const queryLimit = parseInt(limit);

      let result =   await models.partner.aggregate([
        {
          $match: {
            userId: mongoose.Types.ObjectId(userId),

          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: limit * page - queryLimit },
        { $limit: queryLimit },
        {
          $lookup: {
            from: "vipcards",
            localField: "_id",
            foreignField: "eventId",
            pipeline: [{ $project: { cards: 1, userId, _id: 0 } }],
            as: "vips",
          },
        },
        { $unwind: { path: "$vips", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            pipeline: [
              {
                $lookup: {
                  from: "userprofiles",
                  localField: "_id",
                  foreignField: "userId",
                  as: "profile",
                },
              },
              {
                $unwind: { path: "$profile", preserveNullAndEmptyArrays: true },
              },
              {
                $project: {
                  profile: {
                    profileImage: "$profile.profileImage",
                    description: "$profile.description",
                    age: "$profile.age",
                    gender: "$profile.gender",
                    phoneNumber: "$profile.phoneNumber",
                    location: "$profile.location",
                    hobbies: "$profile.hobbies",
                    interests: "$profile.interests",
                    isPrivate: "$profile.isPrivate",
                    phoneCode: "$profile.phoneCode",
                    joinedEvents: "$profile.joinedEvents",
                  },
                  username: 1,
                  email: 1,
                  _id: 1,
                },
              },
            ],
            as: "userDetail",
          },
        },
        { $unwind: { path: "$userDetail", preserveNullAndEmptyArrays: true } },
      ])  

      if (result) {
       return  globalServices.global.returnResponse(
          res,
          200,
          false,
          "Your Business list!",
          result
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "Business not found!",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  deleteBusiness : async (req,res) => {
    const { businessId  } = req.body;

    let { user } = req;
    let userId = user._id; 

    try {
      
      if(!businessId){
        return globalServices.global.returnResponse(
          res,
          400,
          true,
          "Business Id is required",
          {}
        );
      }

      const businessExist = await models.partner.findOne({ _id : businessId });

     if(!businessExist){
      return globalServices.global.returnResponse(
        res,
        403,
        true,
        "Business not found",
        {}
      );
     }
   
     if(businessExist.userId.toString() == userId.toString()){
     
     
    let result = await models.partner.findOneAndDelete({ _id : businessId , userId : userId });
      
    return globalServices.global.returnResponse(
      res,
      200,
      false,
      "business has been deleted",
      {result}
    );
     }else{
      return globalServices.global.returnResponse(
        res,
        401,
        true,
        "You are not eligible to delete this event",
        {}
      );
     }
      
    } catch (error) {
      res.status(500).json(error);
    }
    


  },
  
  updateBusinessState : async (req, res, next) => {
    try {
      let payLoad = req.body;
      // const { eventId , eventState , businessCategory } = req.body;

      let { user } = req;
      let userId = user._id.toString();

      if(!payLoad.businessId &&  !payLoad.businessState ){
       return globalServices.global.returnResponse(
          res,
          400,
          true,
          "Required fields are missing",
          {}
        );
      }
  
      let businessData =  await models.partner.findOne({ _id : payLoad.businessId });
  
    
      if(!businessData){
      return globalServices.global.returnResponse(
          res,
          400,
          true,
          "Business did not exist",
          {}
        );
      }

      const ownerId = businessData.userId.toString()

      if (ownerId == userId) {
    
        let result =  await models.partner.findOneAndUpdate(
           { _id : payLoad.businessId },
            {
              $set: payLoad,
            },
            { new: true }
            );
      
        if (result) {
          globalServices.global.returnResponse(
            res,
            200,
            false,
            "Business state has been updated",
            result
          );
        } else {
          globalServices.global.returnResponse(
            res,
            400,
            true,
            "Failed to update Business State",
            {}
          );
        }
      } else {
        globalServices.global.returnResponse(
          res,
          401,
          true,
          "Only event owner can change Business State",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getBusiness : async (req , res) =>{
    let { user } = req;
    let userId = user._id; 

    try {

      const userBussiness = await models.partner.find({ userId : userId })

      if(!userBussiness){
        return globalServices.global.returnResponse(
          res,
          403,
          true,
          "bussiness not found",
          {}
        );
      }

      return globalServices.global.returnResponse(
        res,
        200,
        false,
        "Your bussiness are",
        {userBussiness}
      );






      
    } catch (error) {
      res.status(500).json(error);
    }


  },

getTopBusiness: async (req, res) => {
  try {
    const { distance, longitude, latitude } = req.query;
    let {limit, page } = req.query;
    const distanceInMeters = Number(distance) * 1000;
    const coordinates = [Number(longitude), Number(latitude)];

    limit = limit ? limit : 5;
      page = page ? page : 1;
      const queryLimit = parseInt(limit);

    const mapTrainings = distanceInMeters
      ? {
          location: {
            $geoWithin: {
              $centerSphere: [coordinates, distanceInMeters / 6371],
            },
          },
        }
      : {};

    const businesses = await models.partner.aggregate([
      { $match: mapTrainings },
      { $skip: limit * page - queryLimit },
      { $limit: queryLimit },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [
            {
              $lookup: {
                from: "userprofiles",
                localField: "_id",
                foreignField: "userId",
                as: "profile",
              },
            },
            {
              $unwind: { path: "$profile", preserveNullAndEmptyArrays: true },
            },
            {
              $project: {
                profile: {
                  profileImage: "$profile.profileImage",
                  description: "$profile.description",
                  age: "$profile.age",
                  gender: "$profile.gender",
                  phoneNumber: "$profile.phoneNumber",
                  location: "$profile.location",
                  hobbies: "$profile.hobbies",
                  interests: "$profile.interests",
                  isPrivate: "$profile.isPrivate",
                  phoneCode: "$profile.phoneCode",
                  joinedEvents: "$profile.joinedEvents",
                },
                username: 1,
                email: 1,
                _id: 1,
              },
            },
          ],
          as: "userDetail",
        },
      },
      { $unwind: { path: "$userDetail", preserveNullAndEmptyArrays: true } },
    ]);

    const participantCounts = await models.addEventparticipents.aggregate([
      {
        $group: {
          _id: "$eventId",
          participantCount: { $sum: { $size: "$Participants" } },
        },
      },
    ]);

    const businessParticipantCounts = {};
    participantCounts.forEach((count) => {
      businessParticipantCounts[count._id.toString()] = count.participantCount;
    });

    const topBusiness = await models.partner.aggregate([
      {
        $match: { _id: { $in: businesses.map((business) => business._id) } },
      },
      {
        $addFields: {
          participantCount: {
            $ifNull: [
              { $toInt: { $ifNull: [businessParticipantCounts["$toString$_id"], 0] } },
              0,
            ],
          },
        },
      },
      {
        $sort: { participantCount: -1 },
      },
    ]);

    if (topBusiness.length > 0) {
      return globalServices.global.returnResponse(
                  res,
                  200,
                  false,
                  "businesses Request list!",
                  topBusiness
                );
    } else {
       return  globalServices.global.returnResponse(
                  res,
                  200,
                  false,
                  "No top businesses found.",
                  []
                );
    }
  } catch (error) {
    console.log(error)
    return res.status(500).json(error);

  }
},
};
