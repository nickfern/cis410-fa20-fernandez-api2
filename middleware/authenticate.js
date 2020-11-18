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

        let CustomerID = decodedToken.pk;
        console.log(CustomerID)


        //2. compare token with database token
        let query = `SELECT CustomerID, FirstName, LastName, Email
        FROM Customer
        WHERE CustomerID = ${CustomerID} and Token = '${myToken}'`

        let returnedUser = await db.executeQuery(query)
        console.log(returnedUser)
        //3. save user information in the request
    if(returnedUser[0]){
        req.Customer = returnedUser[0];
        next()
    }
    else{res.status(401).send('authentication failed.')}
    }catch(myerror){
    res.status(401).send("authentication failed.")
    }
}

module.exports = auth