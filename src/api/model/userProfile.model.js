const mongoose = require("mongoose");

const userProfileSchema = mongoose.Schema(
  {
    profileImage: {
      type: String,
      default: "",
    },

    username: {
      type: String,
      required: [true, "user name is required."],
    },

    email: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    age: {
      type: String,
      default: "",
    },

    gender: {
      type: String,
      default: "",
      enum: ["male", "female"],
    },

    membershipType: {
      type: String,
      default: "free",
    },

    phoneCode: {
      type: String,
      required: [true, "PhoneCode is required"],
    },

    phoneNumber: {
      type: String,
      required: [true, "phoneNumber is required"],
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    hobbies: {
      type: Array,
      default: [],
    },

    interests: {
      type: Array,
      default: [],
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    joinedEvents: [
    {
      eventId : { 
        type: mongoose.Schema.Types.ObjectId,
         ref: "event"
         },
      expirationDate : {
        type : String,
        // default : ""
      }
    }
  ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("userProfile", userProfileSchema);
