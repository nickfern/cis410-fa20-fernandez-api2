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



app.post("/reviews", auth,  async (req,res)=>{

    try{
        var movieFK = req.body.movieFK;
        var summary = req.body.summary;
        var rating = req.body.rating;
    
        if(!movieFK || !summary || !rating){
            res.status(400).send("bad request")
        }

        summary = summary.replace("'","''")
    
        // console.log("here is the contact in /reviews",req.contact)
        // res.send("here is your response")}
    
        let insertQuery = `INSERT INTO Review(Summary, Rating, MovieFK, ContactFK)
        OUTPUT inserted.ReviewPK, inserted.Summary, inserted.Rating, inserted.MovieFK
        VALUES('${summary}','${rating}','${movieFK}',${req.contact.ContactPK})`

        let insertedReview = await db.executeQuery(insertQuery)

        //console.log(insertedReview)
        res.status(201).send(insertedReview[0])
    }
    catch(error){
        console.log("error in POST /reviews", error)
        res.status(500).send()
    }
})

app.get('/contacts/me', auth, (req,res)=>{
    res.send(req.contact)
})

app.get("/hi",(req,res)=>{
    res.send("hello world")
})

app.post("/contacts/login", async (req, res)=>{
    //console.log(req.body)

    var email=req.body.email;
    var password = req.body.password;

    if(!email || !password){
        return res.status(400).send('bad request')
    }

    //check that user email exists in database
    var query = `select * from contact where Email = '${email}'`

    let result;

    try{
        result = await db.executeQuery(query);
    }catch(myError){
        console.log('error in /contacts/login: ', myError);
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

    let token  = jwt.sign({pk: user.ContactPK}, config.JWT, {expiresIn: '60 minutes'})

    //console.log(token)

    //save token in database and send token and user info back to user
    let setTokenQuery = `UPDATE Contact SET Token = '${token}' 
    WHERE ContactPK = ${user.ContactPK}`

    try{
        await db.executeQuery(setTokenQuery)
        res.status(200).send({
            token: token,
            user: {
                NameFirst: user.NameFirst,
                NameLast: user.NameLast,
                Email: user.Email,
                ContactPK: user.ContactPK
            }
        })
    }
    catch(myError){
        console.log("error setting user token ", myError);
        res.status(500).send()
    }
})

app.post("/contacts", async (req,res)=>{
    //res.send("creating user")
    //console.log("request body", req.body)

    var nameFirst = req.body.nameFirst;
    var nameLast = req.body.nameLast;
    var email = req.body.email;
    var password = req.body.password;

    if(!nameFirst || !nameLast || !email || !password){
        return res.status(400).send("bad request")
    }

    nameFirst = nameFirst.replace("'","''")
    nameLast = nameLast.replace("'","''")

    var emailCheckQuery = `SELECT email
    from contact 
    where email = '${email}'`

    var existingUser = await db.executeQuery(emailCheckQuery)

    var hashedPassword = bcrypt.hashSync(password)
    //console.log("existing user", existingUser)
    if(existingUser[0]){
        return res.status(409).send('Please enter a different email.')
    }

    var insertQuery = `insert into contact(NameFirst,NameLast,Email,Password)
    values('${nameFirst}','${nameLast}','${email}','${hashedPassword}')`

    db.executeQuery(insertQuery)
    .then(()=>{res.status(201).send()})
    .catch((err)=>{
        console.log("error in POST /contacts",err)
        res.status(500).send()
    })
})

app.get("/movies",(req,res)=>{
    //get data from database
    db.executeQuery(`SELECT * FROM movie
     LEFT JOIN genre
     ON genre.GenrePK = movie.GenreFK`)
     .then((result)=>{
         res.status(200).send(result)
     })
     .catch((err)=>{
         console.log(err);
         res.status(500).send()
     })
})
app.get("/movies/:pk", (req,res)=>{
    var pk = req.params.pk
    console.log("my PK:" , pk)

    var myQuery = `select *
    from movie
    left join genre
    on genre.GenrePK = movie.GenreFK
    Where moviePK = ${pk}`

    db.executeQuery(myQuery)
        .then((movies)=>{
            //console.log("Movies: ",movies)
            if(movies[0]){
                res.send(movies[0])
            }else{res.status(404).send('bad request')}
        })
        .catch((err)=>{
            console.log("Error in /movies/pk", err)
            res.status(500).send()
        })
})

const PORT = process.env.PORT || 5000
app.listen(PORT,()=>{console.log(`app is running on port ${PORT}`)})