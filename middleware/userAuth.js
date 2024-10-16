module.exports = (req,res,next)=>{
    if(req.session.email){
        return next()
    }else{
        res.redirect('/user/login')
    }
}