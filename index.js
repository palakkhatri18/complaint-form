const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { MongoClient } = require('mongodb');
const multer = require('multer');
const app = express();

// Connection URL
const url = 'mongodb://127.0.0.1:27017/';
const client = new MongoClient(url);

// Database Name
const dbName = 'mriirs';

app.use('/uploads', express.static('uploads'));
app.set('view engine', 'ejs');

// Middleware to parse cookies
app.use(cookieParser());

// Middleware to check if user is authenticated
function checkAuth(req, res, next) {
  const token = req.cookies.auth_token;
  if (token) {
    try {
      jwt.verify(token, 'shhhhh');
      res.locals.isAuthenticated = true;
    } catch (err) {
      res.locals.isAuthenticated = false;
    }
  } else {
    res.locals.isAuthenticated = false;
  }
  next();
}

app.use(checkAuth);

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniquePrefix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.get('/', function (req, res) {
  res.render('home', { isAuthenticated: res.locals.isAuthenticated });
});

app.get('/admin', async function (req, res) {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('complaints');
    const findResult = await collection.find({}).toArray();
    res.render('admin', { complaints: findResult });
  } catch (e) {
    console.error(e);
  }
});

app.post('/', upload.single('uploaded_file'), function (req, res) {
  const a = req.body['user_email'];
  const b = req.body['user_name'];
  const c = req.body['user_location'];
  const d = req.body['user_message'];
  const e = req.file.path;

  async function main() {
    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('complaints');
      await collection.insertOne({ email: a, name: b, location: c, message: d, img_path: e });
    } catch (e) {
      console.error(e);
    } finally {
      client.close();
    }
  }

  main()
    .then(() => res.redirect('/'))
    .catch(console.error);
});

app.post('/signup', function (req, res) {
  const a = req.body['user_email'];
  const b = req.body['user_pwd1'];
  const c = req.body['user_pwd2'];

  if (b === c) {
    bcrypt.hash(b, saltRounds, async function (err, hash) {
      if (err) {
        console.error(err);
        res.status(500).send('Error encrypting password');
        return;
      }

      try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('users');
        const Existuser = await collection.findOne({ email: a });

        if (Existuser) {
          res.send('User already exists');
        } else {
          await collection.insertOne({ email: a, password: hash });
          res.redirect('/');
        }
      } catch (e) {
        console.error(e);
        res.status(500).send('Error storing user');
      } finally {
        client.close();
      }
    });
  } else {
    res.send('Passwords do not match');
  }
});

app.get('/signup', function (req, res) {
  res.sendFile(__dirname + '/views/signup.html');
});

app.get('/login', function (req, res) {
  res.sendFile(__dirname + '/views/login.html');
});

app.post('/login', async function (req, res) {
  const a = req.body['user_email'];
  const b = req.body['user_pwd'];

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('users');
    const user = await collection.findOne({ email: a });

    if (user && await bcrypt.compare(b, user.password)) {
      const token = jwt.sign({ email: a }, 'shhhhh');
      res.cookie('auth_token', token);
      res.render('home', { isAuthenticated: true });
    } else {
      res.send('Invalid email or password');
    }
  } catch (err) {
    console.error(err);
    res.send('Error during login process');
  } finally {
    client.close();
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.redirect('/');
});

app.listen(3000, async () => {
  await client.connect().then(() => {
    console.log('Connected to database');
  }).catch(console.error);
});
