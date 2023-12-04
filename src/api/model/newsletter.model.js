const mongoose = require('mongoose');

const newsletterSchema = mongoose.Schema({

    email:{
        type: String,
        required : true 
    },
   
}
)

module.exports = mongoose.model('newsletter', newsletterSchema);
