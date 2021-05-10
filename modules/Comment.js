const {Schema, model, Types} = require('mongoose')

const Comment = new Schema(
    {
        date: {
            type: String
        },
        username:{
            type: String,
            required: true
        },
        body: {
            type: String,
            required: true
        },
        post: {
            type: Types.ObjectId,
            ref: 'Posts',
        },
        owner: {
            type: Types.ObjectId,
            ref: 'User',
        }
    }
)

module.exports = model('Comment', Comment)