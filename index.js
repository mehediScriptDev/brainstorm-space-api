
const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require("express")
const cors = require("cors")
const dotenv =require("dotenv")
dotenv.config();
const app = express()
const port = process.env.PORT || 8000
const uri = process.env.MONGODB_URI;

app.use(cors())
app.use(express.json())

let ideasCollection = null;
let memoryIdeas = [];

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const client = uri
  ? new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    })
  : null;

async function run() {
  try {
    if (client) {
      await client.connect();
      const db = client.db("IdeaVault");
      ideasCollection = db.collection("Ideas");
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } else {
      console.warn("MONGODB_URI is missing. Using in-memory ideas storage.");
    }

    app.post("/ideas", async (req, res) => {
      const newIdea = req.body || {};

      if (ideasCollection) {
        const result = await ideasCollection.insertOne(newIdea);
        return res.status(201).json({ ...newIdea, _id: result.insertedId });
      }

      memoryIdeas.unshift(newIdea);
      return res.status(201).json(newIdea);
    });

    app.get("/ideas", async (req, res) => {
      if (ideasCollection) {
        const ideas = await ideasCollection.find({}).sort({ createdAt: -1 }).toArray();
        return res.json(ideas);
      }

      return res.json(memoryIdeas);
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})