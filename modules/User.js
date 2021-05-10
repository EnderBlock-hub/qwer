const {Schema, model, Types} = require('mongoose')
const User = new Schema(
    {
        date_reg: {
            type: String
        },
        username: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        posts: [{
            type: Types.ObjectId,
            ref: 'Posts'
        }]
    }
)

module.exports = model('User', User)