const config = require('./config/default')
const User = require('./modules/User')

module.exports =  async (req, res, next) => {
    if (req.method == "OPTIONS"){
        return next()
    }
    try {
        const UserId = req.session.user
        if (!UserId){
            await req.flash("IdError","Пользователь не авторизован")
            await res.redirect('/post/'+req.params.id)
            res.status(401)
        } else {
            return await next()
        }
    } catch (error) {
        await req.flash("IdError","Пользователь не авторизован")
        await res.redirect('/post/'+req.params.id)
        res.status(401)
    }
}