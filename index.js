const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const {MongoClient,ServerApiVersion,ObjectId} = require('mongodb')
require('dotenv').config()
const app = express();
const port = process.env.PORT || 13000;

//middleware
app.use(cors(
  {
  origin:
    ['http://localhost:5173',
      // "https://car-doctor-client-51c26.web.app",
      // "https://car-doctor-client-51c26.firebaseapp.com"
    ],
    credentials:true
  
}
));
app.use(express.json());
app.use(cookieParser());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nviwz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

console.log(uri)

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//middlewares

const logger = async (req,res,next) =>{
  console.log('called:', req.host, req.originalUrl)
  // console.log('log: info', req.method, req.url)
  next()
}

const verifyToken = async(req,res,next) =>{
  const token = req.cookies?.token;
  console.log('value of token in middleware', token)
  if(!token) {
    return res.status(401).send({message: 'not authorized'})
  }

   jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    // error
    if(err){
      console.log(err)
      return res.status(401).send({message: 'unauthorized'})
      
    }
    
    // if token is valid then it would be decoded
    console.log('value in the token', decoded)
    req.user = decoded;
    next()
   })
  
}
const cookeOption ={
  httpOnly:true,
  sameSite:process.env.NODE_ENV === "production"?"none" :'strict',
  secure: process.env.NODE_ENV === "production"? true :false,
    
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollection = client.db('carDoctor').collection('server');

    const bookingCollection = client.db('carDoctor').collection(' bookings');


    //auth related api
app.post('/jwt'
  ,logger
  , async(req,res) =>{
  
  const user = req.body;
  console.log(user);
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,
     {expiresIn: '1h'})

  res.cookie('token', token,cookeOption
  //   {
  //   httpOnly:true,
  //   secure: true,
  //   // true,
  //    //http://localhost:5173,
  //   sameSite: 'none'
  // }
)
  .send({success: true});
// res.send(token)

})

app.post('/logout', async(req,res)=>{
  const user =req.body;
  console.log('logging out',user)
  res.clearCookie('token',{...cookeOption,maxAge:0}).send({success:true})
})


//services related api

    app.get('/server',
      logger,
      async(req,res) =>{
      const filter = req.query;
      console.log(filter)
      const query = {
      // price:{$lte:100},
      // { price: { $gt: 50 } }
      title: {$regex: filter.search, $options:'i'}}

      const options = {
        sort:{
          price:filter.sort === 'asc' ? 1: -1
        }
      }
      

      const cursor = serviceCollection.find(query,options)
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/server/:id', async(req,res) =>{
      const id =req.params.id;
      const query = { _id: new ObjectId(id)}
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1, 	 },
      };
      const result =await serviceCollection.findOne(query,options);
      res.send(result);
    })

    //bookings

    app.get('/bookings',logger, verifyToken , async(req, res) =>{
     
     
      
      console.log(req.query.email);
      console.log('tok tok token',req.cookies.token)
      // console.log('tttt token',req.cookies.token)
      console.log('user in the valid token',req.user)
      // console.log('cook cookies',req.cookies)
      if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      let query = {};
      if (req.query?.email){
        query = { email:req.query.email}
      }

      const result = await bookingCollection.find().toArray();
      res.send(result);


    })


    app.post('/bookings', async(req,res) =>{
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result)
    } );

    app.patch('/bookings/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)};
      const updatedBooking = req.body;
      console.log(updatedBooking);
      const updateDoc = {
        $set:{
          status: updatedBooking.status
        },
       
       
      }
      const result = await bookingCollection.updateOne(filter,updateDoc)
      res.send(result)
    })


    app.delete('/bookings/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bookingCollection.deleteOne(query);
      res.send(result)
    })
    
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
//     await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res) =>{
      res.send('server is running')
})

app.listen(port, () =>{
      console.log(`server is running on port:${port}`)
})



//https://car-doctor-client-51c26.web.app/
//https://car-doctor-client-51c26.firebaseapp.com/
