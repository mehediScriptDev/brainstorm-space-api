
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;
const uri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET || "";

app.use(cors());
app.use(express.json());

let ideasCollection = null;
let memoryIdeas = [];

app.get("/", (req, res) => {
  res.send("IdeaVault API is running");
});

const client = uri
  ? new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
      }
    })
  : null;

function toObjectId(value) {
  if (!value || !ObjectId.isValid(value)) {
    return null;
  }

  return new ObjectId(value);
}

function normalizeIdea(document) {
  if (!document) {
    return null;
  }

  const normalized = { ...document };

  if (normalized._id) {
    normalized._id = normalized._id.toString();
  }

  if (!normalized.id) {
    normalized.id = normalized._id || `idea-${Date.now()}`;
  }

  normalized.likes = Number(normalized.likes || 0);
  normalized.commentsCount = Number(normalized.commentsCount || 0);

  return normalized;
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
}

function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const normalized = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  return Buffer.from(normalized, "base64").toString("utf8");
}

function verifyJwt(token) {
  if (!token) {
    return { valid: false, reason: "missing-token" };
  }

  if (token.startsWith("mock_jwt_")) {
    return { valid: true, payload: null, legacy: true };
  }

  if (!jwtSecret) {
    return { valid: true, payload: null, skipped: true };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "invalid-format" };
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac("sha256", jwtSecret)
    .update(signingInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (signature !== expectedSignature) {
    return { valid: false, reason: "invalid-signature" };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() > payload.exp * 1000) {
      return { valid: false, reason: "expired" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "invalid-payload" };
  }
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  const result = verifyJwt(token);

  if (!result.valid && jwtSecret) {
    return res.status(401).json({ message: "Invalid or missing token" });
  }

  if (result.payload) {
    req.auth = result.payload;
  }

  return next();
}

function findIdeaLocation(identifier) {
  const objectId = toObjectId(identifier);

  if (!identifier) {
    return null;
  }

  return {
    id: identifier,
    objectId
  };
}

async function getIdeaByIdentifier(identifier) {
  const location = findIdeaLocation(identifier);

  if (!location) {
    return null;
  }

  if (ideasCollection) {
    const query = location.objectId
      ? { $or: [{ id: location.id }, { _id: location.objectId }] }
      : { id: location.id };
    const document = await ideasCollection.findOne(query);
    return normalizeIdea(document);
  }

  return normalizeIdea(memoryIdeas.find((idea) => idea.id === location.id || idea._id === location.id));
}

async function updateIdeaByIdentifier(identifier, updates) {
  const location = findIdeaLocation(identifier);

  if (!location) {
    return null;
  }

  if (ideasCollection) {
    const query = location.objectId
      ? { $or: [{ id: location.id }, { _id: location.objectId }] }
      : { id: location.id };

    await ideasCollection.updateOne(
      query,
      { $set: updates }
    );

    const document = await ideasCollection.findOne(query);
    return normalizeIdea(document);
  }

  const index = memoryIdeas.findIndex((idea) => idea.id === location.id || idea._id === location.id);
  if (index === -1) {
    return null;
  }

  memoryIdeas[index] = { ...memoryIdeas[index], ...updates };
  return normalizeIdea(memoryIdeas[index]);
}

async function deleteIdeaByIdentifier(identifier) {
  const location = findIdeaLocation(identifier);

  if (!location) {
    return false;
  }

  if (ideasCollection) {
    const query = location.objectId
      ? { $or: [{ id: location.id }, { _id: location.objectId }] }
      : { id: location.id };

    const result = await ideasCollection.deleteOne(query);
    return result.deletedCount > 0;
  }

  const before = memoryIdeas.length;
  memoryIdeas = memoryIdeas.filter((idea) => idea.id !== location.id && idea._id !== location.id);
  return memoryIdeas.length !== before;
}

app.get("/ideas", async (req, res) => {
  try {
    if (ideasCollection) {
      const ideas = await ideasCollection.find({}).sort({ createdAt: -1 }).toArray();
      return res.json(ideas.map(normalizeIdea));
    }

    return res.json(memoryIdeas.map(normalizeIdea).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    return res.status(500).json({ message: "Failed to load ideas", error: error.message });
  }
});

app.get("/ideas/:id", async (req, res) => {
  try {
    const idea = await getIdeaByIdentifier(req.params.id);

    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    return res.json(idea);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load idea", error: error.message });
  }
});

app.post("/ideas", requireAuth, async (req, res) => {
  try {
    const newIdea = normalizeIdea({
      ...req.body,
      id: req.body?.id || `idea-${Date.now()}`,
      createdAt: req.body?.createdAt || new Date().toISOString(),
      likes: Number(req.body?.likes || 0),
      commentsCount: Number(req.body?.commentsCount || 0)
    });

    if (ideasCollection) {
      const result = await ideasCollection.insertOne(newIdea);
      return res.status(201).json({ ...newIdea, _id: result.insertedId.toString() });
    }

    memoryIdeas.unshift(newIdea);
    return res.status(201).json(newIdea);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create idea", error: error.message });
  }
});

app.put("/ideas/:id", requireAuth, async (req, res) => {
  try {
    const existingIdea = await getIdeaByIdentifier(req.params.id);

    if (!existingIdea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    const sanitizedUpdates = {
      ...req.body,
      id: existingIdea.id,
      likes: req.body?.likes !== undefined ? Number(req.body.likes) : existingIdea.likes,
      commentsCount: req.body?.commentsCount !== undefined ? Number(req.body.commentsCount) : existingIdea.commentsCount
    };

    delete sanitizedUpdates._id;

    const updatedIdea = await updateIdeaByIdentifier(req.params.id, sanitizedUpdates);

    if (!updatedIdea) {
      return res.status(500).json({ message: "Failed to persist updated idea" });
    }

    return res.json(updatedIdea);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update idea", error: error.message });
  }
});

app.delete("/ideas/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await deleteIdeaByIdentifier(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Idea not found" });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete idea", error: error.message });
  }
});

// Profile update: update authorName/photo for a user across ideas and comments
app.put("/profile", requireAuth, async (req, res) => {
  try {
    const { email, name, photoUrl } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (ideasCollection) {
      await ideasCollection.updateMany({ authorEmail: email }, { $set: { authorName: name, authorPhoto: photoUrl } });
    } else {
      // in-memory fallback
      memoryIdeas = memoryIdeas.map((idea) => (idea.authorEmail === email ? { ...idea, authorName: name, authorPhoto: photoUrl } : idea));
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
});

async function startServer() {
  try {
    if (client) {
      await client.connect();
      const db = client.db("IdeaVault");
      ideasCollection = db.collection("Ideas");
      await client.db("admin").command({ ping: 1 });
      console.log("Connected to MongoDB and ready to serve ideas.");
    } else {
      console.warn("MONGODB_URI is missing. Using in-memory ideas storage.");
    }

    app.listen(port, () => {
      console.log(`Example app listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error(error);
    app.listen(port, () => {
      console.log(`Example app listening at http://localhost:${port}`);
    });
  }
}

startServer();