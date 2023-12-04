const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },

    role: {
      type: String,
      default: '',
    },
    isReadAll: {
      type: Boolean,
      default: true,
    },

    fcmToken: {
      type: String,
      default: '',
    },

    types: [
      {
        title: {
          type: String,
          default: '',
        },
        isRead: {
          type: Boolean,
          default: false,
        },
        content: {
          type: String,
          default: '',
        },
        actionId: {
          type: String,
          default: '',
        },

        eventName: {
          type: String,
          default: '',
        },

     
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('notification', notificationSchema)