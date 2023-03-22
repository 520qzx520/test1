const express = require('express')
const app = express()
const router = require('./router')
const cors = require('cors')
app.use(cors())
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({
    extended: false,
    limit: '1024mb'
}));
app.use(router)
const port = 3309
app.listen(port,()=>{
    console.log('api server running at http://127.0.0.1:3309')
})

app.use(express.static('./'))