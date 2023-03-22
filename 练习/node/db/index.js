const mysql = require('mysql')

const db = mysql.createPool({
    host:'localhost',
    user:'root',
    port:'3307',
    password:'123456',
    database:'demo'
})


module.exports = db