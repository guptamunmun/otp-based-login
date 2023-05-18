const express = require('express');

const route = require("./routes")
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

mongoose.connect('mongodb+srv://funupdb-first:VxaFh8Uez4zyv95l@cluster0.kizeuyb.mongodb.net/otp-login?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then( () => console.log("MongoDb is connected"))
.catch ( err => console.log(err) )

app.use('/', route);


app.listen(process.env.PORT || 4000, function () {
    console.log('Express app running on port ' + (process.env.PORT || 4000))
});
