const {Schema, model, Types} = require('mongoose')

const Posts = new Schema(
    {
        date: {
            type: String
        },
        username: {
            type: String
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        changed:{
            type: Boolean
        },
        owner: {
            type: Types.ObjectId,
            ref: 'User',
        },
        comment: [{
            type: Types.ObjectId,
            ref: 'Comment'
        }]
    }
)

module.exports = model('Posts', Posts)