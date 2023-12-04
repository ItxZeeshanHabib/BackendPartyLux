const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    bussinessName: {
      type: String,
      required: [true, 'bussinessName is required.'],
    },

    bussinessCategory: {
      type: String,
      enum: ['club' , 'bar'],
      required: [true, 'bussinessName is required.'],
    },
      photos: {
        type: Array,
        default: [],
      },
  
      businessProfile: {
        type: String,
        default: '',
      },

      place: {
        type: String,
        required: [true, 'place is required.'],
      },
  
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
      },
  
      location: {
        type: {
          type: String,
          enum: ['Point'],
        },
        radius: {
          type: String,
          default: '',
        },
        pinLocation: {
          type: String,
          default: '',
        },
        coordinates: {
          type: [Number],
          index: '2d',
        },
      },

      bussinessStatus: {
        type: String,
        enum: ["approved", "pending", "rejected"],
        default: "approved",
      }, 
  
      cancelationPolicy: {
        type: String,
        enum: ['24 hrs', '48 hrs', '72 hrs', 'any', 'none'],
        required: [true, 'cancelationPolicy is required.'],
      },
  
      admissionFee: {
        male: {
          free: {
            type: Boolean,
            default: false,
          },
          amount: {
            type: Number,
            default: 0,
          },
        },
  
        female: {
          free: {
            type: Boolean,
            default: false,
          },
          amount: {
            type: Number,
            default: 0,
          },
        }
      },
  
      businessWeek: [
          {
            bussinessDay: {
              type: String,
              default: '',
              enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            },
            startTime: {
              type: String,
              default: '',
            },
            endTime: {
              type: String,
              default: '',
            },
            isClose: {
              type: Boolean,
              default: true,
            },
          }    
      ],
  
      maxParticipants: {
        type: String,
        default: '',
        enum: ['0-25', '25-50', '50-100', 'unlimited'],
      },
  
      note: {
        type: String,
        default: '',
      },
  
      businessState: {
        type: String,
        default: 'open',
        enum: ['open', 'close'],
      },
      music: {
        type: Array,
        default: [],
      },
  
      entertainment: {
        type: Array,
        default: [],
      },
  
      disclaimer: {
        type: Array,
        default: [],
      },
  
      vipAccess: {
        type: Boolean,
        default: false,
      },
  
      ageLimit: {
        type: String,
        default: '',
      },
    
  },
  { timestamps: true }
);

module.exports = mongoose.model('business', businessSchema);
