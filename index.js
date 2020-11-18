const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')

const db = require('./dbConnectExec.js')
const config = require('./config.js')
const auth = require('./middleware/authenticate')


//azurewebsites.net, colostate.edu
const app = express();
app.use(express.json())
app.use(cors())



app.post("/order", auth,  async (req,res)=>{

    try{
        var CustomerFK = req.body.CustomerFK;
        var ConcertFK = req.body.ConcertFK;
        var OrderDate = req.body.OrderDate;
        var AdmissionType = req.body.AdmissionType;
    
        if(!CustomerFK || !ConcertFK || !OrderDate || !AdmissionType){
            res.status(400).send("bad request")
        }

        //summary = summary.replace("'","''")
    
        // console.log("here is the contact in /reviews",req.contact)
        // res.send("here is your response")}
    
        let insertQuery = `INSERT INTO Order(CustomerFK, AdmissionType, OrderDate, ConcertFK)
        OUTPUT inserted.TicketID, inserted.CustomerFK, inserted.OrderDate, inserted.AdmissionType
        VALUES('${AdmissionType}','${OrderDate}','${ConcertFK}',${req.Customer.CustomerID})`

        let insertedReview = await db.executeQuery(insertQuery)

        //console.log(insertedReview)
        res.status(201).send(insertedReview[0])
    }
    catch(error){
        console.log("error in POST /order", error)
        res.status(500).send()
    }
})

app.get('/Customer/me', auth, (req,res)=>{
    res.send(req.Customer)
})

app.get("/hi",(req,res)=>{
    res.send("hello world")
})

app.post("/Customer/login", async (req, res)=>{
    //console.log(req.body)

    var email=req.body.email;
    var password = req.body.password;

    if(!email || !password){
        return res.status(400).send('bad request')
    }

    //check that user email exists in database
    var query = `select * from Customer where Email = '${email}'`

    let result;

    try{
        result = await db.executeQuery(query);
    }catch(myError){
        console.log('error in /Customer/login: ', myError);
        return res.status(500).send()
    }

    //console.log(result)

    if(!result[0]){return res.status(400).send('Invalid user credentials')}

    //then check that password matches

    let user = result[0]
    //console.log(user)

    if(!bcrypt.compareSync(password,user.Password)){
        console.log("invalid password");
        return res.status(400).send("Invalid user credentials")
    }

    //generate a token

    let token  = jwt.sign({pk: user.CustomerID}, config.JWT, {expiresIn: '60 minutes'})

    //console.log(token)

    //save token in database and send token and user info back to user
    let setTokenQuery = `UPDATE Customer SET Token = '${token}' 
    WHERE CustomerID = ${user.CustomerID}`

    try{
        await db.executeQuery(setTokenQuery)
        res.status(200).send({
            token: token,
            user: {
                FirstName: user.FirstName,
                LastName: user.LastName,
                Email: user.Email,
                CustomerID: user.CustomerID
            }
        })
    }
    catch(myError){
        console.log("error setting user token ", myError);
        res.status(500).send()
    }
})

app.post("/Customer", async (req,res)=>{
    res.send("creating user")
    console.log("request body", req.body)

    var FirstName = req.body.FirstName;
    var LastName = req.body.LastName;
    var Email = req.body.Email;
    var Password = req.body.Password;
    var DOB = req.body.DOB;

    if(!FirstName || !LastName || !Email || !Password){
        return res.status(400).send("bad request")
    }

    FirstName = FirstName.replace("'","''")
    LastName = LastName.replace("'","''")

    var emailCheckQuery = `SELECT Email
    from Customer 
    where Email = '${Email}'`

    var existingUser = await db.executeQuery(emailCheckQuery)

    var hashedPassword = bcrypt.hashSync(Password)
    //console.log("existing user", existingUser)
    if(existingUser[0]){
        return res.status(409).send('Please enter a different email.')
    }

    var insertQuery = `insert into Customer(FirstName,LastName,Email,Password,DateOfBirth)
    values('${FirstName}','${LastName}','${Email}','${hashedPassword}', '${DOB}')`

    db.executeQuery(insertQuery)
    .then(()=>{res.status(201).send()})
    .catch((err)=>{
        console.log("error in POST /Customer",err)
        res.status(500).send()
    })
})

app.get("/Concert1",(req,res)=>{
    //get data from database
    db.executeQuery(`SELECT * FROM Concert1
     LEFT JOIN genre
     ON genre.GenreID = Concert1.GenreFK`)
     .then((result)=>{
         res.status(200).send(result)
     })
     .catch((err)=>{
         console.log(err);
         res.status(500).send()
     })
})
app.get("/Concert1/:pk", (req,res)=>{
    var pk = req.params.pk
    console.log("my PK:" , pk)

    var myQuery = `select *
    from Concert1
    left join Genre
    on Genre.GenreID = Concert1.GenreFK
    Where ConcertID = ${pk}`

    db.executeQuery(myQuery)
        .then((concerts)=>{
            //console.log("Movies: ",movies)
            if(concerts[0]){
                res.send(concerts[0])
            }else{res.status(404).send('bad request')}
        })
        .catch((err)=>{
            console.log("Error in /Concert1/pk", err)
            res.status(500).send()
        })
})

const PORT = process.env.PORT || 5000
app.listen(PORT,()=>{console.log(`app is running on port ${PORT}`)})