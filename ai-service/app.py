from flask import Flask, request, jsonify
from recommender import Recommender
from predictor import PeakHourPredictor
from db import get_db_connection

app = Flask(__name__)

recommender = Recommender(get_db_connection)
predictor = PeakHourPredictor(get_db_connection)

@app.route('/ai/recommendations', methods=['POST'])
def recommendations():
    body = request.json or {}
    cart_ids = body.get('cartItemIds', [])
    session_ids = body.get('sessionItemIds', [])
    result = recommender.get_similar(cart_ids, exclude=session_ids, top_n=3)
    return jsonify({"recommendations": result})

@app.route('/ai/trending')
def trending():
    result = recommender.trending_today(top_n=5)
    return jsonify({"trending": result})

@app.route('/ai/frequently-with')
def frequently_with():
    items_param = request.args.get('items', '')
    item_ids = [int(i) for i in items_param.split(',')] if items_param else []
    result = recommender.frequently_ordered_with(item_ids, top_n=3)
    return jsonify({"suggestions": result})

@app.route('/ai/peak-hours')
def peak_hours():
    result = predictor.predict()
    return jsonify({"hourlyVolume": result})

if __name__ == '__main__':
    app.run(port=5000)
