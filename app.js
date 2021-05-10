const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const config = require('./config/default')
const bcryptjs = require('bcryptjs')
const {check,validationResult} = require('express-validator')
const path = require('path')
const authAdd = require('./authAdd')
const authProfile = require('./authProfile')
const authId = require('./authId')
const authChange = require('./authChange')
const User = require('./modules/User')
const Posts = require('./modules/Posts')
const Comment = require('./modules/Comment')
const session = require('express-session')
const flash = require('connect-flash')

const PORT = config.PORT || 9000

const app = express()
app.use(express.json())
app.use(express.static(path.resolve(__dirname,'ejs')))
app.use(express.static(path.resolve(__dirname,'img')))
app.use(bodyParser.urlencoded({extended: true}))
app.set('view engine', 'ejs')
app.set('views', path.resolve(__dirname,'ejs'))
app.use(flash())
app.use(
    session({
      secret: config.secretKey,
      saveUninitialized: true,
    })
  )

function time(date){
    var date = new Date()
    if (date.getMonth()< 10){
        if (date.getMinutes() < 10){
            let nowTime = date.getDate()+'-0'+date.getMonth()+'-'+date.getFullYear()+' '+date.getHours()+':0'+date.getMinutes()+':'+date.getSeconds()
            return nowTime
            } else{
            let nowTime = date.getDate()+'-0'+date.getMonth()+'-'+date.getFullYear()+' '+date.getHours()+':'+date.getMinutes()
            return nowTime
            }
    } else {
        if (date.getMinutes() < 10){
            let nowTime = date.getDate()+'-'+date.getMonth()+'-'+date.getFullYear()+' '+date.getHours()+':0'+date.getMinutes()
            return nowTime
            } else{
            let nowTime = date.getDate()+'-'+date.getMonth()+'-'+date.getFullYear()+' '+date.getHours()+':'+date.getMinutes()
            return nowTime
        }
    }
  }

//!home
app.get('/', async (req,res) => {
    try {
        var mass = {}
        const userId = req.session.user
        const posts = await Posts.find().then(posts => {
            posts.slice().reverse().forEach((data,index) => {
                    mass['item'+'_'+index] = {
                        'id':data['_id'],
                        'date':data['date'],
                        'username':data['username'],
                        'title':data['title'],
                        'description':data['description'],
                        'owner':data['owner'],
                        'changed': data['changed']
                }
            })
    })
    res.render('index',{mass:mass,user:userId,active:'/'})
    } catch (error) {
        console.log("Home error: "+error);
        res.redirect('/error')
    }
})


//!profile
app.get('/profile',authProfile,async (req,res) => {
    try {
        const userId = req.session.user
        if (!userId) {
            res.redirect('/registration')
        }
        var countPosts = 0
        var postsMass = {}
        var uploadId = []
        var massUploads = {}
        const posts = await Posts.find({owner:userId}).then(posts => {
            posts.slice().reverse().forEach((data,index) => {
                postsMass['item'+'_'+index] = {
                    'id':data['_id'],
                    'date':data['date'],
                    'username':data['username'],
                    'title':data['title'],
                    'description':data['description'],
                    'changed': data['changed']
            }
            countPosts = index+1
            })
        })
        const user = await User.findOne({_id:userId})
        res.render('profile',{postsMass:postsMass,username:user.username,userId:user.id,count:countPosts,active:'/profile'})
    } catch (error) {
        console.log("Profile error: "+error);
        const userId = req.session.user
        if (!userId) {
            res.redirect('/registration')
        }
    }
})

app.post('/profile',async (req,res) => {
    try {
        const postRequest = req.body
        if (postRequest['deletePost']){
            const removePost = await Posts.deleteOne({_id:postRequest['deletePost']})
            const removeComments = await Comment.deleteMany({post:postRequest['deletePost']})
            await res.redirect('/profile')
        } else{
            req.session.user = null
            await res.redirect('/login')
        }
    } catch (error) {
        console.log("Profile error: "+error);
        res.redirect('/error')
    }
})

//!profile/:id
app.get('/profile/:id', async (req,res) => {
    try {
        const userId = req.params.id
        var countPosts = 0
        var postsMass = {}
        const posts = await Posts.find({owner:userId}).then(posts => {
            posts.slice().reverse().forEach((data,index) => {
                postsMass['item'+'_'+index] = {
                    'id':data['_id'],
                    'date':data['date'],
                    'username':data['username'],
                    'title':data['title'],
                    'description':data['description'],
            }
            countPosts = index+1
            })
        })
        const user = await User.findOne({_id:userId})
        res.render('profileUser',{postsMass:postsMass,username:user.username,userId:user.id,count:countPosts,active:'/'})
    } catch (error) {
        console.log("Profile id error "+error);
        await res.redirect('/error')
        return res.status(400)
    }
})

//!post/:id
app.get('/post/:id', async (req,res) => {
    try {
        const userId = await req.session.user
        var mass = {}
        const posts = await Posts.findOne({_id:req.params.id}).then(post => {
           mass.id = post._id
           mass.date = post.date
           mass.username = post.username
           mass.title = post.title
           mass.description = post.description
           mass.owner = post.owner
        })
        try {
            var commentsMass = {}
            var countComments = 0
            const comments = await Comment.find({post:req.params.id}).then(comment => {
                comment.slice().reverse().forEach((data,index) => {
                    commentsMass['item'+'_'+index] = {
                        'id':data['_id'],
                        'date':data['date'],
                        'username':data['username'],
                        'body':data['body'],
                        'owner':data['owner'],
                }
                countComments = index+1
                })
            })
            res.render('postId',{IdError:req.flash("IdError"),countComments,commentsMass,user:userId,mass:mass})
        } catch (error) {
            console.log(error);
            await res.render('postId',{IdError:req.flash("IdError"),uploads:massUploads,mass:mass,active:'/'})
        }
    } catch (error) {
        console.log("Id error "+error);
        await res.redirect('/error')
        return res.status(400)
    }
})

app.post('/post/:id', authId,async (req,res) => {
    try {
        const userId = await req.session.user
        if (!userId) {
            await req.flash("IdError","Пользователь не авторизован")
            await res.redirect('/post/'+req.params.id)
        }
        const body = req.body
        try {
            if (body['body'] === '' || body['body'] == ' ') {
                req.flash("IdError","Комментарий не может быть пустым")
                res.redirect('/post/'+req.params.id)
                return res.status(400)
            } else {
                const user = await User.findOne({_id:userId})
                const comments = await Comment.create({date:time(),username:user.username,body:body['body'],post:req.params.id,owner:userId})
                await comments.save()
                await res.redirect('/post/'+req.params.id)
            }
        } catch (error) {
            if (body['deleteComment']){ 
                const removeComment = await Comment.deleteOne({_id:body['deleteComment']})
                await res.redirect('/post/'+req.params.id)
            } 
        }
    } catch (error) {
        console.log("Id error "+error);
        res.redirect('/error')
        return res.status(400)
    }
})

//!change/:id
app.get('/change/:id', authChange,async (req,res) => {
    try {
        const userId = await req.session.user
        if (!userId) {
            await res.redirect('/error')
        }
        var massChange = {}
        const post = await Posts.findOne({_id:req.params.id}).then(post => {
            massChange.id = post._id
            massChange.title = post.title
            massChange.description = post.description
        })
        res.render('change',{massChange,ChangeError:req.flash("ChangeError"),active:'/profile'})
    } catch (error) {
        console.log("Change error: "+error);
        res.redirect('/error')
    }
})

app.post('/change/:id', authChange,async (req,res) => {
    try {
        const {title,description} = req.body
        if (title === ''){
            req.flash("ChangeError","Заголовок не может быть пустым")
            res.redirect('/change/'+req.params.id)
            return res.status(400)
        } else if (title.length > 50){
            req.flash("ChangeError","Заголовок не может быть больше 50 символов")
            res.redirect('/change/'+req.params.id)
            return res.status(400)
        }
        try {
            if (description === ''){
                req.flash("ChangeError","Содержание не может быть пустым")
                res.redirect('/change/'+req.params.id)
                return res.status(400)
            }
        } catch (error) {
            console.log('');
        }
        const userId = await req.session.user
        if (!userId) {
            await res.redirect('/error')
        }
        const post = await Posts.updateOne({_id:req.params.id},{changed:true,title,description})
        res.redirect('/profile')
    } catch (error) {
        console.log("Change error: "+error);
        res.redirect('/error')
    }
})

//!registration
app.get('/registration', async (req,res) => {
    try {
        res.render('registration',{RegistrationError:req.flash("RegistrationError"),active:'/profile'})
    } catch (error) {
        console.log("Registration error: "+error);
        res.redirect('/')
    }
})

app.post('/registration', async (req,res) => {
    try {
        const {username,password} = req.body
        if (username === '' || username === ' '){
            req.flash("RegistrationError","Никнейм не может быть пустым")
            res.redirect('/registration')
            return res.status(400)
        }  else if (username.length > 1){
            const usernameSplit = username.split('')
            var massEmpty = []
            for (var key of usernameSplit){
                if (key === '' || key === ' ') {
                    massEmpty.push(' ')
                }
            }
            if (massEmpty.length == usernameSplit.length){
                req.flash("RegistrationError","Никнейм не может быть пустым")
                res.redirect('/registration')
                return res.status(400)
            }
        } else if (username.length > 20) {
            req.flash("RegistrationError","Никнейм не может быть больше 20 символов")
            res.redirect('/registration')
            return res.status(400)
        }
        try {
            if (password.length < 6){
                req.flash("RegistrationError","Пароль не может быть меньше 6 символов")
                res.redirect('/registration')
                return res.status(400)
            } else if (password.length === ''){
                req.flash("RegistrationError","Пароль не может быть пустым")
                res.redirect('/registration')
                return res.status(400)
            }  else if (password.length > 1){
                const passwordSplit = password.split('')
                var massEmpty = []
                for (var key of passwordSplit){
                    if (key === '' || key === ' ') {
                        massEmpty.push(' ')
                    }
                }
                if (massEmpty.length == passwordSplit.length){
                    req.flash("RegistrationError","Пароль не может быть пустым")
                    res.redirect('/registration')
                    return res.status(400)
                }
            } 
        } catch (error) {
            console.log('');
        }
        const candidate = await User.findOne({username})
        if (candidate){
            req.flash("RegistrationError","Пользователь с таким ником уже существует")
            res.redirect('/registration')
            return res.status(400)
        }
        const hashPassword = await bcryptjs.hash(password,10)
        const user = await User.create({date_reg: time(),username,password: hashPassword})
        await user.save()
        req.session.cookie.maxAge = 86400000
        req.session.user = await user.id
        console.log(req.session);
        await res.redirect('/')
    } catch (error) {
        console.log("Registration error: "+error);
        res.redirect('/error')
        res.status(500)
    }
})
//!login
app.get('/login',async (req,res) => {
    try {
        res.render('login',{LoginError:req.flash("LoginError"),active:'/profile'})
        console.log(req.session);
    } catch (error) {
        console.log("Login error: "+error);
        res.redirect('/error')
    }
})

app.post('/login', async (req,res) => {
    try {
        const {username,password} = req.body
        const user = await User.findOne({username})
        if (!user){
            req.flash("LoginError","Пользователь не найден")
            res.redirect('/login')
            return res.status(400)
        }
        const comparePasswords = await bcryptjs.compare(password, user.password)
        if (!comparePasswords){
            req.flash("LoginError","Пароль введён не верно")
            res.redirect('/login')
            return res.status(400)
        }
        req.session.cookie.maxAge = 86400000
        req.session.user = await user.id
        console.log(req.session);
        await res.redirect('/')
    } catch (error) {
        console.log("Login error: "+error);
        res.redirect('/error')
        res.status(500)
    }
})
//!add
app.get('/add',async (req,res) => {
    try {
        res.render('add',{AddError:req.flash("AddError"),active:'/add'})
    } catch (error) {
        console.log("Add error: "+error);
    }
})

app.post('/add', authAdd, async (req,res) => {
    try {
        const userId = await req.session.user
        if (!userId) {
            req.flash("AddError","Пользователь не авторизован")
            res.redirect('/add')
            res.status(401)
        }
        const {title,description} = req.body
        if (title === '' || title == ' '){
            req.flash("AddError","Заголовок не может быть пустым")
            res.redirect('/add')
            return res.status(400)
        }  else if (title.length > 1){
            const titleSplit = title.split('')
            var massEmpty = []
            for (var key of titleSplit){
                if (key === '' || key === ' ') {
                    massEmpty.push(' ')
                }
            }
            if (massEmpty.length == titleSplit.length){
                req.flash("AddError","Заголовок не может быть пустым")
                res.redirect('/add')
                return res.status(400)
            }
        } else if (title.length > 50){
            req.flash("AddError","Заголовок не может быть больше 50 символов")
            res.redirect('/add')
            return res.status(400)
        }
        
        if (description === '' || description == ' '){
            req.flash("AddError","Содержание не может быть пустым")
            res.redirect('/add')
            return res.status(400)
        } else if (description.length > 1){
            const descriptionSplit = description.split('')
            var massEmpty = []
            for (var key of descriptionSplit){
                if (key === '' || key === ' ') {
                    massEmpty.push(' ')
                }
            }
            if (massEmpty.length == descriptionSplit.length){
                req.flash("AddError","Содержание не может быть пустым")
                res.redirect('/add')
                return res.status(400)
            }
        }
        const user = await User.findOne({_id:userId})
        const post = await Posts.create({date: time(),username:user.username,title:title,description:description,owner: userId})
        await post.save()
        await res.redirect('/add')
    } catch (error) {
        console.log("Add error: "+error);
        res.redirect('/error')
    }
})

//!error
app.get('*', async (req,res) => {
    try {
        res.render('error404',{active:'/'})
        res.status(404)
    } catch (error) {
        console.log("Error: "+error);
        res.status(404)
    }
})
async function start() {
    try {
        await mongoose.connect(config.urlMongo, {
            useNewUrlParser:true,
            useUnifiedTopology:true,
            useCreateIndex:true
        })
        app.listen(PORT, () => console.log('Server working...'))
    } catch (error) {
        console.log(error);
    }
}
start()