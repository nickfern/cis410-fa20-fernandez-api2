const jwt = require('jsonwebtoken')

let myToken = jwt.sign({pk: 1234},"secretPassword",{expiresIn: '60 minutes'})

console.log('my token', myToken)

let myDecoded = jwt.verity(myToken, 'secretPassword')
console.log('my decode', myDecoded)