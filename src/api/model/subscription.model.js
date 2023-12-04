const mongoose = require('mongoose');

const subscriptionSchema = mongoose.Schema(
  {
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'userProfile',
    },

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'event',
    },

    // references: [{
    //   type: {
    //     type: String,
    //     required: true,
    //     enum: ['business', 'event' , ],
    //   },
    //   eventId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     // ref : "event",
    //     required: true,
    //   },
    // }],

    subscriptionType: {
      type: String,
      default: '',
    },

    eventOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
    eventName: {
      type: String,
    },

    userId: {
      type: String,
      default: '',
    },
    isCanceledByParticipant: {
      type: Boolean,
      default: false,
    },

    isAcceptedByOwner: {
      type: String,
      
      enum: ['', 'pending', 'accept', 'reject'],
      default: 'accept',
    },
    genderType: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      default: 0,
    },
    VipCardName: {
      type: String,
      default: '',
    },
    membershipType: {
      type: String,
      default: 'free',
    },
    expirationDate : {
      type: String,
      required : [true , "expration date is required"]
    },
    eventType : {
      type: String,
      enum : ["private" , "public" ],
      required : [true , "Event Type  is required"]

    },
    entranceCode : {
      type: String,
      default: ""
    },

    vipCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'vipCard' },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model('subscription', subscriptionSchema);
