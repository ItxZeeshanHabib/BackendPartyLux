const mongoose = require('mongoose');

const reserevdEvents = new mongoose.Schema(
  {
    userId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        // requird : true 
        },
    joinedEvents: [
        {
            eventId : { 
                type: mongoose.Schema.Types.ObjectId,
                 ref: "event",
                //  requird : [true , "Event Id is required"]
                },
              expirationDate : {
                type : String,
                // requird : [true , "Expiration Date is required"]
            },
        }
      ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('reservedEvent', reserevdEvents);
