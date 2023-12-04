const models = require('../model/index');
const moment = require("moment");
const mongoose =  require("mongoose")
const crypto = require('crypto');

let eventServices = (module.exports = {
  createEventByUser: async (payLoad) => {
    let savingObjects = models.event(payLoad);
    let result = await savingObjects.save();
    console.log( "result function" +result)
    return result;
  },

  createMembershipByUser: async (payLoad) => {
    let savingObjects = models.membership(payLoad);
    let result = await savingObjects.save();
    return result;
  },

  partnerCreation: async (payLoad) => {
    let savingObjects = models.partner(payLoad);
    let userUpdate = await models.user.update({_id : payLoad.userId}, {$set: { isPartnerCreated : "pending" }} , {new: true})
    let result = await savingObjects.save();
    return result;
  },

  updateEvent: async (id, payload) => {
    try {
      return await models.event.findOneAndUpdate(
        { _id : id },
        {
          $set: payload,
        },
        { new: true }
      );
    } catch (error) {
      throw createError(500);
    }
  },

  hasAllDaysOfWeek : (businessWeek) => {
    const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const businessWeekDays = businessWeek.map(day => day.bussinessDay.toLowerCase());
    const hasAllDays = daysOfWeek.every(day => businessWeekDays.includes(day));
    return hasAllDays;
  },

  hasMinimumDurationforArray : (businessWeek) => {
    const invalidDurations = [];

    for (let i = 0; i < businessWeek.length; i++) {

      
      const { startTime, endTime } = businessWeek[i];
  
      const startMoment = moment(startTime, "HH:mm");
      const endMoment = moment(endTime, "HH:mm");
  
      const duration = moment.duration(endMoment.diff(startMoment));
      const durationInHours = duration.asHours();
  
      if (durationInHours < 5) {
        invalidDurations.push(businessWeek[i]);
      }
    }
  
    return invalidDurations;
  },

  hasMinimumDuration : (startTime , endTime) => {

     const startDateTime = new Date(startTime);

     const endDateTime = new Date(endTime);


    const startMoment = moment(startDateTime, "YYYY-MM-DD hh:mm:ss");
    const endMoment = moment(endDateTime, "YYYY-MM-DD hh:mm:ss");

    const duration = moment.duration(endMoment.diff(startMoment));
    const durationInHours = duration.asHours();

    return durationInHours <= 3;
  },

  addparticipant : async (payLoad) => {
    let savingObjects = models.addEventparticipents(payLoad);
    let result = await savingObjects.save();
    console.log( "result function" +result)
    return result;
  },

   getMaleFemaleParticipantCount : async (eventId , category) => {
    try {
      // Match the event with the specified eventId
  
      // Use the aggregation framework to group and calculate the count for each gender
      const participantCountByGender = await models.addEventparticipents.aggregate([
        { $match: { eventId : mongoose.Types.ObjectId(eventId), } },
        {
          $unwind: '$Participants',
        },
        {
          $group: {
            _id : '$Participants.gender',
            count: { $sum: 1 },
          },
        },
      ]);

      // Process the result to get the counts for male and female participants
      let maleCount = 0;
      let femaleCount = 0;
  
      for (const result of participantCountByGender) {
        console.log("genderof loop" + result)
        if (result._id == 'male') {
          maleCount = result.count;
        } else if (result._id == 'female') {
          femaleCount = result.count;
        }
      }
  
      return { maleCount, femaleCount };
    } catch (error) {
      // Handle errors if needed
      console.error('Error:', error);
      throw error; // or return an appropriate response
    }
  },

   formatDateToISO : async (date , startTime,EndTime ) => {
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = date.getUTCDate().toString().padStart(2, "0");
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");
    const milliseconds = date.getUTCMilliseconds().toString().padStart(3, "0");
    const timezoneOffset = date.getTimezoneOffset();
    const timezoneOffsetHours = Math.abs(Math.floor(timezoneOffset / 60)).toString().padStart(2, "0");
    const timezoneOffsetMinutes = (Math.abs(timezoneOffset) % 60).toString().padStart(2, "0");
    const timezoneSign = timezoneOffset >= 0 ? "-" : "+";
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${timezoneSign}${timezoneOffsetHours}:${timezoneOffsetMinutes}`;
    return formattedDate;
  },

  calculateExpirationDate : (startStr, endStr) => {
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (end < start) {s
      end.setDate(end.getDate() + 1); // Add one day to the end date
    }

    return end;
  },

  cutTenPercent : (totalPrice) => {
    const percentToCut = 10; // 10 percent
    const cutAmount = (percentToCut / 100) * totalPrice;
    const finalAmount = totalPrice - cutAmount;
    return finalAmount;
  },

   generateRandomCode : (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = crypto.randomBytes(length);
    const codeArray = new Array(length);

    randomBytes.forEach((byte, index) => {
        codeArray[index] = characters[byte % characters.length];
    });

    return codeArray.join('');
}
});
