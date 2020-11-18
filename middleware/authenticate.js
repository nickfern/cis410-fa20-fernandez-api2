const jwt = require('jsonwebtoken')

const db = require('../dbConnectExec.js')
const config = require('../config.js')

const auth = async(req,res,next)=>{


    // console.log(req.header('Authorization'))
    try{


        //1. decode token
        let myToken = req.header('Authorization').replace('Bearer ','')
        // console.log(myToken)
        let decodedToken = jwt.verify(myToken, config.JWT) 
        //console.log(decodedToken)

        let contactPK = decodedToken.pk;
        console.log(contactPK)


        //2. compare token with database token
        let query = `SELECT ContactPK, NameFirst, NameLast, Email
        FROM Contact
        WHERE ContactPK = ${contactPK} and Token = '${myToken}'`

        let returnedUser = await db.executeQuery(query)
        console.log(returnedUser)
        //3. save user information in the request
    if(returnedUser[0]){
        req.contact = returnedUser[0];
        next()
    }
    else{res.status(401).send('authentication failed.')}
    }catch(myerror){
    res.status(401).send("authentication failed.")
    }
}

module.exports = auth