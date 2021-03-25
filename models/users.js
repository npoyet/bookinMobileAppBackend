// collection users dans la base Bookin sur MongoDB


var mongoose = require('mongoose');


var userSchema = mongoose.Schema({
    token: String,
    avatar: String,
    email: String,
    password: String,
    userLibraryName: String,
    library: [{type:mongoose.Schema.Types.ObjectId, ref:'books'}],
    wishlist: [{type:mongoose.Schema.Types.ObjectId, ref:'books'}],
   });
   
var UsersModel = mongoose.model('users', userSchema);
module.exports = UsersModel;