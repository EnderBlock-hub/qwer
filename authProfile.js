const config = require('./config/default')
const User = require('./modules/User')

module.exports =  async (req, res, next) => {
    if (req.method == "OPTIONS"){
        return next()
    }
    try {
        const UserId = req.session.user
        if (!UserId){
            req.flash("error","Пользователь не авторизован")
            res.redirect('/registration')
            res.status(401)
        } else {
            return next()
        }
    } catch (error) {
        req.flash("error","Пользователь не авторизован")
        res.redirect('/registration')
        res.status(401)
    }
}