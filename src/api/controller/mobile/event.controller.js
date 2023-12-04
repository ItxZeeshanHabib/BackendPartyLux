const globalServices = require("../../services/index");
const moment = require("moment");

const models = require("../../model");
const mongoose = require("mongoose");
const { removeParticipant } = require("../../services/event.services");
module.exports = {


  createEvent: async (req, res) => {
    try {    
      let payLoad = req.body;     
      let { user } = req;
      let userId = user._id.toString();
      let userRole = user.role;

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

      if(payLoad.eventType === "public"){
        payLoad.entrenceCode = []
      }

      
      if (
        payLoad.eventType === "private" &&
        (!payLoad.entrenceCode || payLoad.entrenceCode.length === 0)
    ) {
        return globalServices.global.returnResponse(
            res,
            401,
            true,
            "At least 1 entrance code is required",
            {}
        );
    }
    

    if(payLoad.eventType == "private"){
      for(let i=0;i< payLoad.entrenceCode.length;i++){
        var randomCode = await globalServices.event.generateRandomCode(8)
        payLoad.entrenceCode[i].code  = randomCode;
       }
    }
       
      
      Object.assign(payLoad, { userId: userId });

    // const timeDuration =  globalServices.event.hasMinimumDuration(payLoad.startDateTime, payLoad.endDateTime);


      // if(timeDuration){
      //   return globalServices.global.returnResponse(
      //     res,
      //     400,
      //     true,
      //     "Time must be has at least 3 hours difference",
      //     {}
      //   );
      // }


        var result = await globalServices.event.createEventByUser(payLoad);

       if (result) {
          return globalServices.global.returnResponse(
            res,
            200,
            false,
            "Event created successfully",
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
    
    } catch (error) {
      res.status(500).json(error);
    }
  },

 getEventList: async (req, res) => {
    try {
      let { user } = req;
      let userId = user._id.toString();
      let { limit, page } = req.query;
      let { distance } = req.query;

      let {
        price_range,
        search,
        maxParticipants,
        eventCategory,
        longitude,
        latitude,
      } = req.query;

      let { searchEvent } = req.query;

      limit = limit ? limit : 5;
      page = page ? page : 1;
      const queryLimit = parseInt(limit);

      const searchQuery = searchEvent || '';

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
            name: {
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
                // {
                //   'admissionFee.couple.amount': {
                //     $gte: priceObj.min,
                //     $lte: priceObj.max,
                //   },
                // },
              ],
            }
          : {};
 

     const currentDate = new Date();


     const formattedDate = await globalServices.event.formatDateToISO(currentDate);

     const notExpiredEvents = { endDateTime: { $gte: formattedDate } };

      console.log("searchQuery--------------------------------------------: ", JSON.stringify(searchQuery) )

      let result;


   result = await models.event.aggregate([
    {
      $match: {
        ...priceFilter,
        ...mapTrainings,
        ...notExpiredEvents,
        ...queryFilter,
      }
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
          "Event list!",
          result
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "Event not found!",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getEventRequestList: async (req, res) => {
    try {
      let { user } = req;
      let userId = user._id.toString();
      const { eventId } = req.params;
      let { limit, page } = req.query;

      limit = limit ? limit : 5;
      page = page ? page : 1;
      const queryLimit = parseInt(limit);

      let result = await models.subscription.aggregate([
        {
          $match: {
            eventId: mongoose.Types.ObjectId(eventId),
            isAcceptedByOwner: "pending",
          },
        },
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
                    // description: '$profile.description',
                    age: "$profile.age",
                    gender: "$profile.gender",
                    // phoneNumber: '$profile.phoneNumber',
                    // location: '$profile.location',
                    // hobbies: '$profile.hobbies',
                    // interests: '$profile.interests',
                    // isPrivate: '$profile.isPrivate',
                    // phoneCode: '$profile.phoneCode',
                    // joinedEvents: '$profile.joinedEvents',
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
        {
          $lookup: {
            from: "vipcards",
            localField: "eventId",
            foreignField: "eventId",
            pipeline: [
              // {
              //   $match: {
              //     cards: {
              //       $elemMatch: {
              //         $expr: {
              //           $eq: ["$$vipCardId", "$_id"] // Replace '$$modelColumn' with your aggregate model column name and 'fieldName' with the field name within the cards array
              //         }
              //         // _id: "$subscription.vipCardId"
              //       }
              //     }
              //   }
              // },
              // { $match:{ cards: {$elemMatch:{_id : vipCardId} }}},
              {
                $project: {
                  cards: 1,
                  // {
                  //   $filter: {
                  //     input: '$cards',
                  //     as: 'card',
                  //     cond: {
                  //       $eq: ['$$card._id', "vipCardId"]
                  //     }
                  //   }
                  // },
                  _id: 0,
                },
              },
            ],
            as: "vips",
          },
        },
        { $unwind: { path: "$vips", preserveNullAndEmptyArrays: true } },
      ]);

      // let result = await models.subscription
      // .find({
      //   eventId: mongoose.Types.ObjectId(eventId),
      //   isAcceptedByOwner : "pending"
      // })
      // .populate('vipCardId')
      // .populate({ path: 'userProfile', select: 'profileImage fullName age' })
      // .sort({ createdAt: -1 })
      // .skip(limit * page - queryLimit)
      // .limit(queryLimit);

      if (result) {
        globalServices.global.returnResponse(
          res,
          200,
          false,
          "Event Request list!",
          result
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "Event Request not found!",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getEventDetails: async (req, res) => {
    try {
      let { user } = req;
      let userId = user._id.toString();

      let { eventId } = req.body;

      const currentDate = new Date();


      var formatedDate = await globalServices.event.formatDateToISO(currentDate);

      const reservedData = await models.subscription.findOne({
        userId: userId,
        eventId: eventId,
        expirationDate: { $gt: formatedDate  }
      });

      let ispurchased = (reservedData) ? true : false

      const event =  await models.event.findOne({ _id: eventId }) ;

      if (event) {

        let eventDetails =   await models.event.aggregate([
          { $match: { _id: mongoose.Types.ObjectId(eventId) } },
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
        ]);

        let count = await globalServices.event.getMaleFemaleParticipantCount(eventId)

        let participantCount =  {
          totalCount : count.maleCount + count.femaleCount,
          maleCount : count.maleCount,
          femaleCount : count.femaleCount,
          ispurchased : ispurchased
         }



        const getFirstObject = eventDetails[0]
        const mergedObject = { ...getFirstObject, ...participantCount};
        globalServices.global.returnResponse(
          res,
          200,
          false,
          "Event Details!",
          mergedObject
        );
      } else {
        globalServices.global.returnResponse(
          res,
          400,
          true,
          "No event with that Id found",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  updateUserEvent : async (req, res) => {
    try {
      let payLoad = req.body;

      let { eventId  } = req.params;

      let { user } = req;
      let userId = user._id.toString();

      let event =  await models.event.findOne({
        _id: eventId,
        $and: [{ userId: userId }],
      }) ;

      if (event && event?.eventState === "open") {
        let result = await globalServices.event.updateEvent(eventId, payLoad);

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
      } else if (event && event?.eventState !== "open") {
        globalServices.global.returnResponse(
          res,
          401,
          true,
          "Event has started! You cannot update event now",
          {}
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "event not found against this detail you provide!",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getMyEventList: async (req, res) => {
    try {
      let { user } = req;
      const userId = user._id.toString();
      let { limit, page , bussinessCategory} = req.query;

      limit = limit ? limit : 5;
      page = page ? page : 1;
      const queryLimit = parseInt(limit);

      const currentDate = new Date();


const formattedDate = await globalServices.event.formatDateToISO(currentDate);

      console.log(formattedDate)
      let result = (bussinessCategory == "houseParty") ? 
      await models.event.aggregate([
        {
          $match: {
            userId: mongoose.Types.ObjectId(userId),
            endDateTime: { $gte: formattedDate },
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
      :
      await models.partner.aggregate([
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

      // let result = await models.event
      //   .find({
      //     userId: userId,
      //   })
      //   .sort({ createdAt: -1 })
      //   .skip(limit * page - queryLimit)
      //   .limit(queryLimit);

      if (result) {
        globalServices.global.returnResponse(
          res,
          200,
          false,
          "Event list!",
          result
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "Event not found!",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getMyReserveEvents: async (req, res) => {
    try {
      let { user } = req;
      const userId = user._id
      .toString();
      let { limit, page } = req.query;

      limit = limit ? limit : 5;
      page = page ? page : 1;
      const queryLimit = parseInt(limit);

      let result = await models.subscription.aggregate([
        { $match: { userId: userId } },
        { $sort: { createdAt: -1 } },
        { $skip: limit * page - queryLimit },
        { $limit: queryLimit },

        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            pipeline: [
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
            ],
            as: "event",
          },
        },
        { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
       
       
      ]);

      if (result) {
       return  globalServices.global.returnResponse(
          res,
          200,
          false,
          "Reserve Event list!",
          result
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "Event not found!",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getMyEventsHistory: async (req, res) => {
    try {
      let { user } = req;
      const userId = user._id.toString();
      let { limit, page } = req.query;

      limit = limit ? limit : 5;
      page = page ? page : 1;
      const queryLimit = parseInt(limit);

      let eventPipeline = [
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
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
      ];

      let result1 = await models.event.aggregate(eventPipeline);

      let subscriptionPipeline = [
        { $match: { userId: userId } },
        { $sort: { createdAt: -1 } },
        { $skip: limit * page - queryLimit },
        { $limit: queryLimit },
        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            pipeline: [
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
              {
                $unwind: {
                  path: "$userDetail",
                  preserveNullAndEmptyArrays: true,
                },
              },
            ],
            as: "event",
          },
        },
        { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
      ];
      let result2 = await models.subscription.aggregate(subscriptionPipeline);

      const combinedResults = await Promise.all([result1, result2]);

      if (combinedResults) {
        globalServices.global.returnResponse(
          res,
          200,
          false,
          "Reserve Event list!",
          { myEvents: result1, reserveEvents: result2 }
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "Event not found!",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  eventCancelByPlayer: async (req, res) => {
    try {
      let { user } = req;
      const userId = user._id.toString();
      let { eventId } = req.body;
      let event = await models.event.findById(eventId);
      if (!event) {
        return globalServices.global.returnResponse(
          res,
          404,
          true,
          "No such event found that you requested for cancellation",
          {}
        );
      }
      if (!event?.participants.length) {
        return globalServices.global.returnResponse(
          res,
          404,
          true,
          "No participants found for that event you requested for cancellation",
          {}
        );
      }
      const participant = event.participants.find(
        (participant) => participant.userId === userId
      );
      //check if your user id is found in the participants array
      if (event.participants && participant) {
        if (participant.isCanceledByParticipant) {
          return globalServices.global.returnResponse(
            res,
            404,
            true,
            "You have already canceled this event",
            {}
          );
        }
        if (
          event.cancelationPolicy != "none" &&
          event.cancelationPolicy != "any"
        ) {
          const hours = parseInt(event.cancelationPolicy.split(" ")[0]);
          const startDate = moment(event.startDate);

          // Get the current time
          const currentDate = moment(new Date());

          // Calculate the hour difference
          const hoursDiff = startDate.diff(currentDate, "hours");

          //cancel time event remaining
          if (hours <= hoursDiff) {
            //wallet have credit valuebecause of particapante cancel there Subscription
            let wallet = await models.wallet.findOne({ userId: userId });

            if (wallet) {
              const creditTransaction = {
                eventId: event._id.toString(),
                transType: "credit",
                refund: "pending",
                amount: event.price,
                action: "event cancel by participant",
                participateId: userId,
              };

              const debitTransaction = {
                eventId: event._id.toString(),
                transType: "debit",
                refund: "",
                amount: event.price,
                action: "participant is refunded there price",
                ownerId: event.userId,
              };

              wallet = await models.wallet.findOneAndUpdate(
                { userId: userId },
                {
                  $inc: { balance: event.price ? event.price : 0 },
                  $push: { transacrion: { ...creditTransaction } },
                  // $push: { transacrion: {...debitTransaction} }
                },
                { new: true }
              );

              wallet = await models.wallet.findOneAndUpdate(
                { userId: event.userId },
                {
                  $inc: { balance: event.price ? -event.price : 0 },
                  $push: { transacrion: { ...debitTransaction } },
                },
                { new: true }
              );

              const updateEvent = await models.event.findOneAndUpdate(
                {
                  participants: { $elemMatch: { userId: userId } },
                },
                {
                  $set: { "participants.$.isCanceledByParticipant": true },
                },
                { new: true }
              );

              const updateSubscription =
                await models.subscription.findOneAndUpdate(
                  { userId: userId },
                  {
                    $set: { isCanceledByParticipant: true },
                  },
                  { new: true }
                );

              if (updateEvent && updateSubscription && wallet) {
                return globalServices.global.returnResponse(
                  res,
                  200,
                  false,
                  "You have successfully cancelled your event",
                  wallet
                );
              } else {
                return globalServices.global.returnResponse(
                  res,
                  404,
                  true,
                  "Something went wrong while Transaction!",
                  {}
                );
              }
            } else {
              return globalServices.global.returnResponse(
                res,
                404,
                true,
                "No Wallet Found with that userId!",
                {}
              );
            }
          } else {
            return globalServices.global.returnResponse(
              res,
              404,
              true,
              "You have not enough hours to cancel this event",
              {}
            );
          }
        } else {
          return globalServices.global.returnResponse(
            res,
            404,
            true,
            "You have not any cancel Policy for this event",
            {}
          );
        }
      } else {
        return globalServices.global.returnResponse(
          res,
          404,
          true,
          "You are not participate in this event",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getPlayerCurrentBalance: async (req, res) => {
    try {
      let { user } = req;
      const userId = user._id.toString();
      let wallet = await models.wallet.findOne({ userId });
      if (wallet) {
        return globalServices.global.returnResponse(
          res,
          200,
          false,
          'You have successfully get your wallet!',
          wallet
        );
      } else {
        return globalServices.global.returnResponse(
          res,
          404,
          true,
          "There no wallet exist with that userId!",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  // all live events for users
  getLiveEventList: async (req, res) => {
    try {
      let { limit, page } = req.query;
      const validEventsType = ["club", "bar"];

      let { eventCategory, myEvents } = req.query;
      if (!validEventsType.includes(eventCategory)) {
        res.status(404).send({
          error: true,
          status: 404,
          msg: "eventCategory enum is not a valid event category",
          data: {},
        });
        return;
      }

      limit = limit ? limit : 5;
      page = page ? page : 1;
      const queryLimit = parseInt(limit);

      ///// eventCategory filter ///////
      const eventFilter =
        eventCategory &&
        eventCategory !== "" &&
        validEventsType.includes(req.query.eventCategory)
          ? {
              eventCategory: req.query.eventCategory,
              eventState: "start",
            }
          : {};

      let result = await models.event
        .find({
          ...eventFilter,
        })
        .sort({ createdAt: -1 })
        .skip(limit * page - queryLimit)
        .limit(queryLimit);

      if (result) {
        globalServices.global.returnResponse(
          res,
          200,
          false,
          "Event list!",
          result
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "Event not found!",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  ownerLiveEventList: async (req, res) => {
    try {
      let { user } = req;
      const userId = user._id.toString();
      console.log("userId", userId);
      let { limit, page } = req.query;
      const validEventsType = ["club", "bar"];

      let { eventCategory } = req.query;
      if (!validEventsType.includes(eventCategory)) {
        res.status(404).send({
          error: true,
          status: 404,
          msg: "eventCategory enum is not a valid event category",
          data: {},
        });
        return;
      }

      limit = limit ? limit : 5;
      page = page ? page : 1;
      const queryLimit = parseInt(limit);

      ///// eventCategory filter ///////
      const eventFilter =
        eventCategory &&
        eventCategory !== "" &&
        validEventsType.includes(req.query.eventCategory)
          ? {
              eventCategory: req.query.eventCategory,
              eventState: "start",
            }
          : {};

      let result = await models.event
        .find({
          userId: mongoose.Types.ObjectId(userId),
          ...eventFilter,
        })
        .sort({ createdAt: -1 })
        .skip(limit * page - queryLimit)
        .limit(queryLimit);

      if (result) {
        globalServices.global.returnResponse(
          res,
          200,
          false,
          "Event list!",
          result
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "Event not found!",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },
  
  addParticipents : async (req,res) => {
   
    try {
      const { eventId ,category } = req.body;
      let { user } = req;

      let userId = user._id.toString();


      const removedParticipant = await models.addEventparticipents.updateMany(
        {
          "Participants.participantsId": userId
        },
        { $pull: { Participants: { participantsId: userId } } }
      );

      if (removedParticipant.nModified > 0) {
       console.log("Participant has been removed from all events")
      }

      const event = (category == "houseParty") ? await models.event.findOne({  _id : eventId }) : await models.partner.findOne({  _id : eventId });

      const userProfile =  await models.userProfile.findOne({  userId : userId });


      const eventParticipant = await models.addEventparticipents.findOne({  eventId : eventId });

      if(!userProfile){
        return globalServices.global.returnResponse(
          res,
          404,
          true,
          "Please complete your profile first",
          {}
        )
      }

      if(!event){
        return globalServices.global.returnResponse(
          res,
          404,
          true,
          "Event not Found",
          {}
        )
      }

      const currentDate = new Date();

// console.log( "ios formate date " + isoString); // Output will be in the desired format


      let ParticipantData = {
        participantsId : userId,
        gender : userProfile.gender,
        addedAt : currentDate
      }

      if(eventParticipant){

        const participantExists = eventParticipant.Participants.find(
          (participant) => participant.participantsId == userId
        );

    
        if (participantExists) {
          return globalServices.global.returnResponse(
            res,
            200,
            false,
            "Participant already exists in the event",
            {}
          );
        }

      let userData  = await eventParticipant.Participants.push(ParticipantData);
      await eventParticipant.save();
        return globalServices.global.returnResponse(
          res,
          200,
          false,
          "Participant has been added successfully",
          ParticipantData
        );

      }else{

      var result = await models.addEventparticipents.create({
        eventId : eventId,
        Participants :  [ParticipantData]
      })

      if (result) {
        return globalServices.global.returnResponse(
          res,
          200,
          false,
          "Participant has been added successfully",
          ParticipantData
        );
      }
    }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  removeParticipant : async(req,res) =>{
    const { eventId } = req.body;

    let { user } = req;
      let userId = user._id.toString();

   try {

    const event = await models.addEventparticipents.findOne({ eventId : eventId });

    if (!event) {
      return globalServices.global.returnResponse(
        res,
        403,
        true,
        "Event not found",
        {}
      )
        
    }

    const existingParticipant = event.Participants.find(
      (participant) => participant.participantsId == userId
    );

    console.log( " existingParticipant " + existingParticipant )

    if (!existingParticipant) {
      return globalServices.global.returnResponse(
        res,
        403,
        true,
        "Participant does not exist",
        {}
      )
    }

    const updatedEvent = await models.addEventparticipents.findOneAndUpdate(
      { eventId : eventId },
      { $pull: { Participants: { participantsId: userId } } },
      { new: true } // Return the updated document
    );

    // Check if the participant was removed successfully
    const removedParticipant = updatedEvent.Participants.find(
      (participant) => participant.participantsId.toString() === userId
    );

    if (!removedParticipant) {
      // return { success: true, message: 'Participant removed successfully' };
      return globalServices.global.returnResponse(
        res,
        200,
        true,
        "Participant removed successfully",
        {}
      )
    } else {
      // return { success: false, message: 'Failed to remove the participant' };
      return globalServices.global.returnResponse(
        res,
        200,
        true,
        "Failed to remove the participant",
        {}
      )
    }
   } catch (error) {
    res.status(500).json(error);
   }

  },

  removeParticipantFromAllEvents: async (req, res) => {
    try {
      const { user } = req;
      const userId = user._id.toString();
      
      // Find events where the participant exists and remove the participant
      const result = await models.addEventparticipents.updateMany(
        {
          "Participants.participantsId": userId
        },
        { $pull: { Participants: { participantsId: userId } } }
      );
  
      if (result.nModified > 0) {
        return globalServices.global.returnResponse(
          res,
          200,
          true,
          "Participant removed successfully from all events",
          {}
        );
      } else {
        return globalServices.global.returnResponse(
          res,
          403,
          true,
          "Participant does not exist in any event",
          {}
        );
      }
    } catch (error) {
      console.error(error);
      res.status(500).json(error);
    }
  },
  
  
  
  

  getParticipantDetail : async (req,res) =>{
    const { eventId } = req.body;

    try {
      const event = await models.addEventparticipents.findOne({ eventId: eventId });
    
      if (!event) {
        return globalServices.global.returnResponse(
          res,
          403,
          true,
          "Event not found",
          {}
        );
      }
    
      const participantIds = event.Participants.map((participant) => participant.participantsId);
    
      const usersData = await models.userProfile.find({ userId: { $in: participantIds } });
    
      const formattedUsersData = usersData.map((userData) => (
        userData
      ));
    
      return globalServices.global.returnResponse(
        res,
        200,
        false,
        "Participant details are given below",
       formattedUsersData 
      );
    } catch (error) {
      res.status(500).json(error);
    }
  },

  deleteEvent : async (req,res) => {
    const { eventId  } = req.body;

    let { user } = req;
    let userId = user._id; 

    try {

      const eventExist = await models.event.findOne({ _id : eventId }) 

     if(!eventExist){
      return globalServices.global.returnResponse(
        res,
        403,
        true,
        "Event not found",
        {}
      );
     }
   
     if(eventExist.userId.toString() == userId.toString()){
   
      
      let data = await models.event.findOneAndDelete({ _id : eventId , userId : userId })
    
    if(!data){
      return globalServices.global.returnResponse(
        res,
        400,
        true,
        "Event has not deleted",
        {}
      );
    }
    return globalServices.global.returnResponse(
      res,
      200,
      false,
      "Event has been deleted",
      data
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


  getparticipant : async (req , res) =>{
    let { eventId } = req.body;
    // let { limit, page } = req.query;
    try {

    // limit = limit ? limit : 5;
    //   page = page ? page : 1;
    //   const queryLimit = parseInt(limit);

    const participantsData =  await  models.addEventparticipents.aggregate([
      { $match: { eventId: mongoose.Types.ObjectId(eventId) } },
      // { $skip: limit * page - queryLimit },
      // { $limit: queryLimit },
      // { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "Participants.participantsId",
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
      {
        $project: {
          _id: 0, // Exclude the _id field from the output
          eventId: 1, // Include the eventId field in the output
          userDetail: 1, // Include the userDetail field in the output
        },
      },
    ]) 


if (!participantsData || participantsData.length === 0) {
  return globalServices.global.returnResponse(
    res,
    403,
    true,
    "no participant found",
    {}
  );
}


// Assuming you want to return the list of participants
return globalServices.global.returnResponse(
  res,
  200,
  false,
  "participant's are listed below",
  participantsData
);
      
    } catch (error) {
      res.status(500).json(error);
    }
  },
  
  getTopEvents: async (req, res) => {
    try {
      let { housePartiesCount, BusinessCount } = req.query;

      housePartiesCount = housePartiesCount ? housePartiesCount : 3;
      BusinessCount = BusinessCount ? BusinessCount : 7;
    // const queryLimit = parseInt(limit);

    const currentDate = new Date();


    const formattedDate = await globalServices.event.formatDateToISO(currentDate);

      // const currentDayOfWeek = currentDate.getDay();
      // const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      // const currentDayName = daysOfWeek[currentDayOfWeek];

      const notExpiredEvents = { endDateTime: { $gte: formattedDate } };

      const houseParties = await models.event.aggregate([
        {
          $match: {
            ...notExpiredEvents, 
          }
        },
        // { $skip: limit * page - queryLimit },
        // { $limit: queryLimit },
        // { $sort: { createdAt: -1 } },
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

      const businesses =   await models.partner.aggregate([
        {
          $match: {
            bussinessStatus: "approved",
        eventState: "open",
        // "businessWeek.bussinessDay": currentDayName,
          },
    
        },
        // { $skip: limit * page - queryLimit },
        // { $limit: queryLimit },
        // { $sort: { createdAt: -1 } },
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

      // Shuffling the array using Fisher-Yates Shuffle algorithm
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const shuffledParties = shuffleArray(houseParties);
const shuffledBusiness = shuffleArray(businesses);


const selectedParties = (shuffledParties.length > housePartiesCount) ? shuffledParties.filter(item => item.eventCategory == "houseParty").slice(0, housePartiesCount) : shuffledParties;

const selectedbusiness = (shuffledBusiness.length > BusinessCount) ? shuffledBusiness.slice(0, BusinessCount) : shuffledBusiness ;

const combinedEvents = [...selectedParties, ...selectedbusiness];



      const arrayOfObjects = Object.values(combinedEvents);

      // console.log("selectedParties " + selectedParties)
      // console.log("selectedbusiness " + selectedbusiness)
      // console.log("combinedEvents " + combinedEvents)


    
      if (arrayOfObjects.length > 0) {
        globalServices.global.returnResponse(
          res,
          200,
          false,
          "Event Request list!",
          arrayOfObjects
        );
      } else {
        globalServices.global.returnResponse(
          res,
          200,
          false,
          "No approved events found.",
          []
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  updateEventState : async (req, res, next) => {
    try {
      let payLoad = req.body;
      // const { eventId , eventState , eventCategory } = req.body;

      let { user } = req;
      let userId = user._id.toString();

      console.log("userId" +userId )

      if(!payLoad.eventId &&  !payLoad.eventState  && !payLoad.eventCategory){
       return globalServices.global.returnResponse(
          res,
          400,
          true,
          "Required fields are missing",
          {}
        );
      }
  
      if (!userId) {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "user not found!",
          {}
        );
      }
  
      let EventData = (payLoad.eventCategory == "houseParty") ? await models.event.findOne({ _id : payLoad.eventId }) :  await models.partner.findOne({ _id : payLoad.eventId });
  
    
      if(!EventData){
      return globalServices.global.returnResponse(
          res,
          400,
          true,
          "Event did not exist",
          {}
        );
      }

      console.log("userId " + userId)

      const ownerId = EventData.userId.toString()

      console.log(ownerId == userId)


      if (ownerId == userId) {
        console.log("yeaa we are here")
    
        let result = (payLoad.eventCategory == "houseParty") ?
         await models.event.findOneAndUpdate( { 
          _id : payLoad.eventId },
          {
            $set: payLoad,
          },
          { new: true }) :
           await models.partner.findOneAndUpdate(
           { _id : payLoad.eventId },
            {
              $set: payLoad,
            },
            { new: true }
            );
  
    

        // let result = await globalServices.event.updateEvent(
        //   eventId,
        //   eventState,
        //   eventCategory
        // )
      
        if (result) {
          globalServices.global.returnResponse(
            res,
            200,
            false,
            "Event state has been updated",
            result
          );
        } else {
          globalServices.global.returnResponse(
            res,
            401,
            true,
            "Failed to update Event State",
            {}
          );
        }
      } else {
        globalServices.global.returnResponse(
          res,
          401,
          true,
          "Only event owner can change event State",
          {}
        );
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  validateRefrenceCode : async (req,res) => {
    try {
      let payLoad = req.body;

    let { user } = req;
    let userId = user._id.toString();

    if(!payLoad.eventId &&  !payLoad.entrenceCode){
     return globalServices.global.returnResponse(
        res,
        400,
        true,
        "Required fields are missing",
        {}
      );
    }

    let eventData = await models.event.findOne({
      _id: payLoad.eventId
    })

    // console.log("eventData" + eventData + "eventData.entrenceCode " ) 

    if(!eventData) {
      return globalServices.global.returnResponse(
        res,
        400,
        true,
        "no event found",
        {}
      );
    }

    let codeFound = eventData.entrenceCode.find(obj => obj.code === payLoad.entrenceCode);

    if(!codeFound){
      return globalServices.global.returnResponse(
        res,
        400,
        true,
        "invalid code",
        {}
      );
    }

    return globalServices.global.returnResponse(
      res,
      200,
      false,
      "yea your code is valid",
      codeFound
    );

  
    } catch (error) {
      res.status(500).json(error);
      console.log("error " + error )
    }
  },

  getBusinessHousePatiesAroundYou : async (req,res) => {
    try {

      let { user } = req;
      let userId = user._id.toString();
      const { distance, longitude, latitude } = req.query;
      const distanceInMeters = Number(distance) * 1000;
      const coordinates = [Number(longitude), Number(latitude)];
  
      businessLimit =  10;
      businessPage =  1;
      const businessQueryLimit = parseInt(businessLimit);

      eventLimit =  10;
      eventPage =  1;
      const eventQueryLimit = parseInt(businessLimit);
  
      const mapTrainings = distanceInMeters
        ? {
            location: {
              $geoWithin: {
                $centerSphere: [coordinates, distanceInMeters / 6371],
              },
            },
          }
        : {};

        const checkBusinessState = { businessState : 'open'};
        const isApproved = { bussinessStatus: 'approved' };

        console.log("checkBusinessState " + checkBusinessState)
  
      const businesses = await models.partner.aggregate([
        { $match: {
          ...mapTrainings,
          ...checkBusinessState,
          ...isApproved
        } },
        { $skip: businessLimit * businessPage - businessQueryLimit },
        { $limit: businessQueryLimit },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
         
            as: "userDetail",
          },
        },
        { $unwind: { path: "$userDetail", preserveNullAndEmptyArrays: true } },
        // {
        //   $project: {
        //     _id: 1,
        //     bussinessCategory : 1,
        //   },
        // },
      ]);

      const currentDate = new Date();

      var formatedDate = await globalServices.event.formatDateToISO(currentDate);

      const notExpiredEvents = { expirationDate: { $gte: formatedDate } };
      const matchUserId = { participant: mongoose.Types.ObjectId(userId) };

      let houseParties = await models.subscription.aggregate([
        {
          $match: {
            ...matchUserId,
            ...notExpiredEvents,
            ...mapTrainings
          },
        },
        { $skip: eventLimit * eventPage - eventQueryLimit },
        { $limit: eventQueryLimit },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "eventDetail",
          },
        },
        {
          $unwind: { path: "$eventDetail", preserveNullAndEmptyArrays: true },
        },
        // {
        //   $project: {
        //     _id: 1,
        //     expirationDate: 1,
        //     eventId : 1,
        //   },
        // },
      ]);   

      const transformedHouseParties = houseParties.map((entry) => ({
        _id: entry.eventId,
        category: entry.eventDetail.eventCategory,
        location : entry.eventDetail.location,
        name : entry.eventDetail.name
      }));


      const transformedBusinesses = businesses.map((entry) => ({
        _id: entry._id,
        category: entry.bussinessCategory,
        location : entry.location,
        name : entry.bussinessName
      }));
    
      const combinedArray = [...transformedBusinesses, ...transformedHouseParties];
    
  
      if (combinedArray.length > 0) {
        return globalServices.global.returnResponse(
                    res,
                    200,
                    false,
                    "businesses & parties Request list!",
                    combinedArray
                  );
      } else {
         return  globalServices.global.returnResponse(
                    res,
                    200,
                    false,
                    "No businesses & parties are present in your region.",
                    []
                  );
      }
    } catch (error) {
      console.log(error)
      return res.status(500).json(error);
  
    }
  }

};
