
const express = require('express')
const app = express()
var bodyParser = require('body-parser')
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { MongoClient } = require('mongodb');

// Connection URL
const url = 'mongodb://127.0.0.1:27017/'
const client = new MongoClient(url);

// Database Name
const dbName = 'mriirs';
const multer = require('multer')
app.use('/uploads', express.static('uploads'))

app.set("view engine", "ejs")

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniquePrefix + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })



// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.get('/', function (req, res) {
  res.render('home')
})

app.get('/admin', async function (req, res) {
  try {
    await client.connect();
    console.log('Connected successfully to server');
    const db = client.db(dbName);
    const collection = db.collection('complaints');
    const findResult = await collection.find({}).toArray();
    console.log('Found documents =>', findResult);
    // the following code examples can be pasted here...
    res.render('admin', { complaints: findResult })

    return 'done.';
  } catch (e) {
    console.error(e);
  }
})

app.post('/', upload.single('uploaded_file'), function (req, res) {
  let a = req.body['user_email']
  let b = req.body['user_name']
  let c = req.body['user_location']
  let d = req.body['user_message']
  let e = req.file.path
  // console.log(a, b, c, d)

  async function main() {
    // Use connect method to connect to the server
    try {
      await client.connect();
      console.log('Connected successfully to server');
      const db = client.db(dbName);
      const collection = db.collection('complaints');
      // the following code examples can be pasted here...
      let result = await collection.insertOne({ email: a, name: b, location: c, message: d, img_path: e })
      return 'done.';
    } catch (e) {
      console.error(e);
    }
  }

  // console.log(e)
  // console.log(req.file)
  // console.log(req.body)


  main()
    .then(console.log)
    .catch(console.error)
    .finally(() => client.close());
  res.redirect('/')
})

app.post('/signup', function (req, res) {
  let a = req.body['user_email']
  let b = req.body['user_pwd1']
  let c = req.body['user_pwd2']
  if (b === c) {
    console.log(a, b)
    bcrypt.hash(b, saltRounds, function (err, hash) {
      let z = hash
      console.log(z)
      async function store_user() {
        // Use connect method to connect to the server
        try {
          await client.connect();
          console.log('Connected successfully to server');
          const db = client.db(dbName);
          const collection = db.collection('users');
          // the following code examples can be pasted here...
          let result = await collection.insertOne({ email: a, password: z })
          return 'done.';
        } catch (e) {
          console.error(e);
        }
      }

      store_user()
        .then(console.log)
        .catch(console.error)
        .finally(() => client.close());
      res.redirect('/')
      // Store hash in your password DB.
    });
  }
  else {
    res.send('passwords do not match')
  }
})

app.get('/signup', function (req, res) {
  res.sendFile(__dirname + '/views/signup.html')
})

app.listen(3000)