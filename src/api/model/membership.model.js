const mongoose = require('mongoose');

const membershipSchema = mongoose.Schema(
  {
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'userProfile',
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },

    membershipType: {
      type: String,
      default: 'free',
      enum: ['vip', 'free'],
    },

    amount: {
      type: Number,
      default: 0,
    },
    expirationDate: {
      type: Date,
      default: function() {
        if (this.membershipType === 'vip') {
          const expirationDate = new Date();
          expirationDate.setMonth(expirationDate.getMonth() + 1);
          return expirationDate;
        }
        return undefined;
      },
    },
    
    isExpired: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('membership', membershipSchema);
