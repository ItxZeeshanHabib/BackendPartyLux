const mongoose =  require("mongoose")


const addParticipants = mongoose.Schema({
    eventId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'event',
        required : true
    },
    Participants : [
        {
        participantsId : { 
            type: mongoose.Schema.Types.ObjectId,
             ref: 'User',
            //  required : true
        },
        gender : { 
            type: String,
            // required : true
        },
        addedAt : { 
            type: String,
            // required : true
        }
    }
    ],
})

module.exports = mongoose.model('participant', addParticipants);