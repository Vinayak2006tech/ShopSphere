import os
import time
import json
import threading
from typing import List, Dict, Optional
from collections import defaultdict
import requests
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pika

app = FastAPI(
    title="ShopSphere Recommendation Engine",
    description="Python Data Science Microservice computing co-purchase matrices and collaborative filtering",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PORT = int(os.environ.get("PORT", 5007))
PRODUCT_SERVICE_URL = os.environ.get("PRODUCT_SERVICE_URL", "http://localhost:5002")
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")

# In-memory Co-occurrence and Product Store
co_occurrences: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
item_counts: Dict[str, int] = defaultdict(int)
products_cache: Dict[str, dict] = {}
rabbitmq_connected = False
start_time = time.time()

# Seed default artisanal pairings for catalog cold start
INITIAL_PAIRINGS = [
    # Walnut Catch-all Desk Tray + Heavyweight Brass Bottle Opener
    ("6ab7d0449cbac705295433b1", "6ab7d0449cbac705295433af"),
    # Terracotta Pourer + Matte Stoneware Bowl Set
    ("6ab7d0449cbac705295433ae", "6ab7d0449cbac705295433b0"),
    # Vegetable-Tanned Leather Journal + Solid Walnut Catch-All Desk Tray
    ("6ab7d0449cbac705295433b2", "6ab7d0449cbac705295433b1"),
    # Pure Linen Woven Throw + Hand-Dipped Beeswax Taper Candles
    ("6ab7d0449cbac705295433b4", "6ab7d0449cbac705295433b3"),
    # Stoneware Pour-Over Dripper + Terracotta Pourer
    ("6ab7d0449cbac705295433b5", "6ab7d0449cbac705295433ae"),
]

def record_order_copurchases(product_ids: List[str]):
    for i in range(len(product_ids)):
        pid_a = product_ids[i]
        item_counts[pid_a] += 1
        for j in range(i + 1, len(product_ids)):
            pid_b = product_ids[j]
            co_occurrences[pid_a][pid_b] += 1
            co_occurrences[pid_b][pid_a] += 1

def seed_initial_pairings():
    for pair in INITIAL_PAIRINGS:
        record_order_copurchases(list(pair))

def fetch_products_catalog():
    global products_cache
    try:
        res = requests.get(f"{PRODUCT_SERVICE_URL}/products?limit=100", timeout=3)
        if res.status_code == 200:
            data = res.json().get("data", {}).get("products", [])
            for p in data:
                products_cache[p["id"]] = p
            print(f"[RECS] Loaded {len(products_cache)} products into memory.")
    except Exception as e:
        print(f"[RECS] Warning loading products: {e}")

# RabbitMQ Event Listener in Background Thread
def rabbitmq_worker():
    global rabbitmq_connected
    while True:
        try:
            params = pika.URLParameters(RABBITMQ_URL)
            connection = pika.BlockingConnection(params)
            channel = connection.channel()

            channel.exchange_declare(exchange="ecommerce_events", exchange_type="topic", durable=True)
            result = channel.queue_declare(queue="recommendation_service_queue", durable=True)
            queue_name = result.method.queue

            channel.queue_bind(exchange="ecommerce_events", queue=queue_name, routing_key="order.created")
            channel.queue_bind(exchange="ecommerce_events", queue=queue_name, routing_key="payment.completed")

            rabbitmq_connected = True
            print(f"[RECS] RabbitMQ connected and listening on {queue_name}")

            def on_message(ch, method, properties, body):
                try:
                    payload = json.loads(body.decode("utf-8"))
                    items = payload.get("payload", {}).get("items", [])
                    pids = [item["productId"] for item in items if "productId" in item]
                    if len(pids) >= 1:
                        record_order_copurchases(pids)
                        print(f"[RECS] Updated co-occurrence matrix for {len(pids)} items from order")
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    print(f"[RECS] Error processing message: {e}")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_consume(queue=queue_name, on_message_callback=on_message)
            channel.start_consuming()
        except Exception as e:
            rabbitmq_connected = False
            print(f"[RECS] RabbitMQ connection failed: {e}. Retrying in 5s...")
            time.sleep(5)

@app.on_event("startup")
def startup_event():
    seed_initial_pairings()
    threading.Thread(target=fetch_products_catalog, daemon=True).start()
    threading.Thread(target=rabbitmq_worker, daemon=True).start()

@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "recommendation-service",
        "engine": "Python 3 + Pandas Collaborative Filtering",
        "uptime": round(time.time() - start_time, 2),
        "coPurchasePairs": len(co_occurrences),
        "cachedProducts": len(products_cache),
        "dependencies": {
            "messageQueue": "HEALTHY" if rabbitmq_connected else "CONNECTING",
            "catalogSource": "HEALTHY" if len(products_cache) > 0 else "WARMING_UP"
        }
    }

@app.get("/recommendations/product/{product_id}")
def get_recommendations_for_product(product_id: str, limit: int = Query(4, ge=1, le=10)):
    if not products_cache:
        fetch_products_catalog()

    source_product = products_cache.get(product_id)
    if not source_product:
        # Try fetching by id directly
        try:
            r = requests.get(f"{PRODUCT_SERVICE_URL}/products/{product_id}", timeout=2)
            if r.status_code == 200:
                source_product = r.json().get("data")
                if source_product:
                    products_cache[source_product["id"]] = source_product
        except Exception:
            pass

    recommendations = []
    seen_ids = {product_id}

    # 1. Check Co-purchase Frequency using Item Correlation
    partner_counts = co_occurrences.get(product_id, {})
    if partner_counts:
        ranked_partners = sorted(partner_counts.items(), key=lambda item: item[1], reverse=True)
        for partner_id, score in ranked_partners:
            if partner_id in products_cache and partner_id not in seen_ids:
                p = products_cache[partner_id]
                recommendations.append({
                    **p,
                    "recommendationReason": "Frequently purchased together",
                    "confidenceScore": float(score) / (item_counts[product_id] + 1)
                })
                seen_ids.add(partner_id)
                if len(recommendations) >= limit:
                    break

    # 2. Fill remaining slots with same-category high-rated items
    if len(recommendations) < limit and source_product:
        category = source_product.get("category")
        candidates = [
            p for p in products_cache.values()
            if p["id"] not in seen_ids and p.get("category") == category
        ]
        candidates.sort(key=lambda x: x.get("rating", 0), reverse=True)
        for c in candidates:
            recommendations.append({
                **c,
                "recommendationReason": f"Curated favorite in {category}",
                "confidenceScore": 0.75
            })
            seen_ids.add(c["id"])
            if len(recommendations) >= limit:
                break

    # 3. Fill any last slots with top rated catalog items
    if len(recommendations) < limit:
        candidates = [p for p in products_cache.values() if p["id"] not in seen_ids]
        candidates.sort(key=lambda x: x.get("rating", 0), reverse=True)
        for c in candidates:
            recommendations.append({
                **c,
                "recommendationReason": "ShopSphere Studio Best Seller",
                "confidenceScore": 0.50
            })
            seen_ids.add(c["id"])
            if len(recommendations) >= limit:
                break

    return {
        "success": True,
        "productId": product_id,
        "recommendations": recommendations[:limit]
    }

@app.get("/recommendations/trending")
def get_trending(limit: int = Query(4, ge=1, le=8)):
    if not products_cache:
        fetch_products_catalog()

    # Sort products by reviewsCount + rating
    sorted_products = sorted(
        products_cache.values(),
        key=lambda x: (x.get("rating", 0) * 10) + x.get("reviewsCount", 0),
        reverse=True
    )
    return {
        "success": True,
        "trending": sorted_products[:limit]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
