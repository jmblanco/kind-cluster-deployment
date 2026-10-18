import express from 'express';
import { Kafka, logLevel } from 'kafkajs';
import { MongoClient } from 'mongodb';

const PORT = parseInt(process.env.PORT || '8080', 10);
const KAFKA_BOOTSTRAP = process.env.KAFKA_BOOTSTRAP_SERVERS || 'kafka-cluster-kafka-bootstrap.kafka.svc:9092';
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'orders.incoming';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://root:localClusterPass123!@kind-mongodb:27017';
const DB_NAME = process.env.DB_NAME || 'orders_db';
const COLLECTION_NAME = 'orders';

const app = express();
app.use(express.json());

let mongoClient = null;
let ordersCollection = null;
let kafkaProducer = null;
let kafkaConsumer = null;
let isReady = false;

// Hexagonal In-memory fallback if external infra is still booting
const inMemoryOrders = [];

// Initialize Kafka
async function initKafka() {
  try {
    const kafka = new Kafka({
      clientId: 'order-service',
      brokers: KAFKA_BOOTSTRAP.split(','),
      logLevel: logLevel.ERROR,
      retry: {
        initialRetryTime: 300,
        retries: 5
      }
    });

    kafkaProducer = kafka.producer();
    await kafkaProducer.connect();
    console.log('[Kafka] Producer connected successfully.');

    kafkaConsumer = kafka.consumer({ groupId: 'order-service-consumer-group' });
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: true });

    await kafkaConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          console.log(`[Kafka Consumer] Received OrderEvent on ${topic}:`, payload);

          const orderRecord = {
            ...payload,
            processedAt: new Date().toISOString(),
            status: 'CONFIRMED'
          };

          if (ordersCollection) {
            await ordersCollection.updateOne(
              { orderId: orderRecord.orderId },
              { $set: orderRecord },
              { upsert: true }
            );
          } else {
            inMemoryOrders.push(orderRecord);
          }
        } catch (err) {
          console.error('[Kafka Consumer] Error processing message:', err.message);
        }
      }
    });
    console.log(`[Kafka] Consumer subscribed to topic: ${KAFKA_TOPIC}`);
  } catch (err) {
    console.warn(`[Kafka] Warning during init: ${err.message}. Retrying asynchronously...`);
    setTimeout(initKafka, 5000);
  }
}

// Initialize MongoDB
async function initMongo() {
  try {
    mongoClient = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 4000
    });
    await mongoClient.connect();
    const db = mongoClient.db(DB_NAME);
    ordersCollection = db.collection(COLLECTION_NAME);
    console.log('[MongoDB] Connected successfully to orders_db.');
    isReady = true;
  } catch (err) {
    console.warn(`[MongoDB] Warning during connection: ${err.message}. Running with graceful fallback.`);
    setTimeout(initMongo, 5000);
  }
}

// REST Endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    kafkaProducer: Boolean(kafkaProducer),
    mongoConnected: Boolean(ordersCollection),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/orders', async (req, res) => {
  try {
    if (ordersCollection) {
      const orders = await ordersCollection.find().sort({ createdAt: -1 }).limit(50).toArray();
      return res.json({ source: 'mongodb', data: orders });
    }
    return res.json({ source: 'memory_fallback', data: inMemoryOrders });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { item, quantity, customer, price } = req.body;
    if (!item) {
      return res.status(400).json({ error: 'Field "item" is required' });
    }

    const orderId = 'ORD-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const orderEvent = {
      orderId,
      item: item || 'Kind Dev Sandbox',
      quantity: quantity || 1,
      customer: customer || 'developer@local.test',
      price: price || 99.00,
      createdAt: new Date().toISOString()
    };

    if (kafkaProducer) {
      await kafkaProducer.send({
        topic: KAFKA_TOPIC,
        messages: [{ key: orderId, value: JSON.stringify(orderEvent) }]
      });
      return res.status(201).json({
        message: 'OrderCreatedEvent published to Kafka',
        order: orderEvent
      });
    }

    // Fallback if producer is not yet ready
    if (ordersCollection) {
      await ordersCollection.insertOne({ ...orderEvent, status: 'SAVED_DIRECT' });
    } else {
      inMemoryOrders.push({ ...orderEvent, status: 'SAVED_IN_MEMORY' });
    }

    return res.status(201).json({
      message: 'Order saved directly (Kafka not ready yet)',
      order: orderEvent
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Demo Order Service listening on port ${PORT}`);
  initMongo();
  initKafka();
});
