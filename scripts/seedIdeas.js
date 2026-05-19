const { MongoClient } = require("mongodb");
require("dotenv").config();

const initialIdeas = [
  {
    id: "idea-1",
    title: "MediConnect AI",
    shortDescription: "AI-driven patient triaging and clinical workflow automation platform.",
    detailedDescription: "MediConnect AI leverages custom NLP models to analyze patient intake data, predict triage severity levels, and route them to optimal medical professionals. This dramatically reduces emergency room wait times and administrative burden for doctors, resulting in higher patient throughput and fewer medical errors.",
    category: "Health",
    tags: ["AI", "Healthcare", "SaaS"],
    imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop",
    budget: "$45,000",
    targetAudience: "Hospitals, private clinics, emergency care centers.",
    problemStatement: "Emergency room wait times are soaring and clinical administrative overhead consumes over 30% of doctors' working hours, causing severe burnout.",
    proposedSolution: "Develop a secure, HIPAA-compliant AI triage engine that captures patient complaints, auto-summarizes clinical history, and suggests initial triage categories with 94% accuracy.",
    authorEmail: "admin@ideavault.com",
    authorName: "Sarah Jenkins",
    createdAt: new Date("2026-05-10T14:30:00.000Z")
  },
  {
    id: "idea-2",
    title: "EduSphere VR",
    shortDescription: "Immersive virtual reality classrooms for STEM learning in schools.",
    detailedDescription: "EduSphere VR brings textbook science and math to life. With interactive 3D physics simulators, molecular chemistry modeling, and astronomical space tours, student engagement skyrockets. Schools can subscribe to curriculum-aligned modules that students explore using low-cost virtual reality headsets.",
    category: "Education",
    tags: ["EdTech", "VR", "STEM"],
    imageUrl: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?q=80&w=800&auto=format&fit=crop",
    budget: "$65,000",
    targetAudience: "Middle and high schools, remote learning academic programs.",
    problemStatement: "Traditional STEM teaching methods often struggle to explain abstract, spatial scientific concepts, leading to lower student retention and interest.",
    proposedSolution: "A school-friendly VR curriculum platform complete with ready-to-run interactive simulations that align with global science standards.",
    authorEmail: "john@ideavault.com",
    authorName: "John Davis",
    createdAt: new Date("2026-05-12T09:15:00.000Z")
  },
  {
    id: "idea-3",
    title: "EcoTrace Supply Chain",
    shortDescription: "Blockchain verification tracking for sustainable consumer brands.",
    detailedDescription: "EcoTrace is a transparency-as-a-service application. It enables eco-conscious brands to track every step of their supply chain—from raw material farming to shipping—and display it to consumers via a verified QR code on packaging. Every transaction and supply node is anchored to an eco-friendly blockchain network.",
    category: "Tech",
    tags: ["Blockchain", "Sustainability", "Web3"],
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop",
    budget: "$30,000",
    targetAudience: "Ethical fashion labels, organic food producers, carbon-neutral brands.",
    problemStatement: "Greenwashing makes it difficult for sustainable brands to prove their authenticity, while consumers are skeptical of generic eco-friendly claims.",
    proposedSolution: "Create an open-API supply ledger backed by cryptographically signed receipts from farmers, auditors, and shipping partners, presenting a gorgeous consumer journey map.",
    authorEmail: "emma@ideavault.com",
    authorName: "Emma Watson",
    createdAt: new Date("2026-05-13T16:45:00.000Z")
  },
  {
    id: "idea-4",
    title: "FinGrow Micro-Invest",
    shortDescription: "Micro-investing and automated tax savings tailored for gig workers.",
    detailedDescription: "FinGrow automatically rounds up gig transactions (Uber, Fiverr, Upwork) and allocates those cents to a diversified, tax-advantaged portfolio. The app calculates estimated quarterly taxes in real-time, setting aside appropriate funds to prevent end-of-year tax shock for freelancers.",
    category: "Finance",
    tags: ["FinTech", "GigEconomy", "Automation"],
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=800&auto=format&fit=crop",
    budget: "$25,000",
    targetAudience: "Freelancers, independent contractors, ride-share drivers.",
    problemStatement: "Gig economy workers experience volatile incomes and rarely save for retirement, while constantly getting penalized for miscalculating freelance taxes.",
    proposedSolution: "Build a smart wallet app linked to gig bank accounts that routes pennies to investments and automatically cushions estimated tax liabilities.",
    authorEmail: "admin@ideavault.com",
    authorName: "Sarah Jenkins",
    createdAt: new Date("2026-05-14T11:20:00.000Z")
  },
  {
    id: "idea-5",
    title: "MindEase Companion",
    shortDescription: "Generative AI mental wellness app for daily emotional journaling.",
    detailedDescription: "MindEase acts as an active listener and wellness planner. Users chat naturally with an emotionally aware AI companion, which provides customized mindfulness exercises, identifies cognitive distortions, and maps mood logs over time. It stands as an interim wellness aid before professional therapy.",
    category: "Health",
    tags: ["MentalHealth", "AI", "Wellness"],
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop",
    budget: "$20,000",
    targetAudience: "Stressed professionals, university students, wellness seekers.",
    problemStatement: "Mental health therapy is highly expensive, difficult to schedule, and suffers from social stigma, preventing millions from getting timely emotional support.",
    proposedSolution: "A secure, therapeutic AI assistant powered by CBT and DBT methodologies, designed for low-stress daily wellness check-ins.",
    authorEmail: "emma@ideavault.com",
    authorName: "Emma Watson",
    createdAt: new Date("2026-05-15T08:00:00.000Z")
  }
];

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db("IdeaVault");
    const coll = db.collection("Ideas");

    for (const idea of initialIdeas) {
      // insert only if an idea with same id/email/title doesn't exist
      const exists = await coll.findOne({ id: idea.id });
      if (!exists) {
        await coll.insertOne({ ...idea });
        console.log("Inserted", idea.id);
      } else {
        console.log("Skipped (exists)", idea.id);
      }
    }

    console.log("Done");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
