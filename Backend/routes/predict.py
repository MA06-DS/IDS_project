from flask import Blueprint, request, jsonify
import logging
import pandas as pd
from utils.load_model import model_loader
from utils.preprocessing import preprocess_prediction_input, load_dataset

predict_bp = Blueprint('predict', __name__)
logger = logging.getLogger(__name__)

@predict_bp.route('/predict', methods=['POST'])
def predict():
    try:
        # Get JSON data from request
        if not request.is_json:
            return jsonify({
                "success": False,
                "error": "Content-Type must be application/json"
            }), 400
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        # Load model
        model = model_loader.load_model()
        
        # Preprocess input
        features = preprocess_prediction_input(data)
        
        # Make prediction
        prediction = model.predict(features)
        predicted_value = float(prediction[0])
        
        logger.info(f"Prediction successful for {data.get('symbol')}: {predicted_value}")
        
        # Return response
        return jsonify({
            "success": True,
            "prediction": round(predicted_value, 2),
            "symbol": data.get('symbol'),
            "input_features": {
                "open": data.get('open'),
                "high": data.get('high'),
                "low": data.get('low'),
                "close": data.get('close'),
                "volume": data.get('volume')
            }
        }), 200
    
    except ValueError as ve:
        logger.warning(f"Validation error: {str(ve)}")
        return jsonify({
            "success": False,
            "error": str(ve)
        }), 400
    
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Prediction failed",
            "details": str(e)
        }), 500

@predict_bp.route('/stocks', methods=['GET'])
def get_stocks():

    try:
        # First try to get from dataset (includes all stocks)
        df = load_dataset()
        
        # Get symbol column
        symbol_column = None
        if 'Name' in df.columns:
            symbol_column = 'Name'
        elif 'Symbol' in df.columns:
            symbol_column = 'Symbol'
        elif 'symbol' in df.columns:
            symbol_column = 'symbol'
        
        if symbol_column:
            # Get all unique stocks from dataset
            dataset_stocks = sorted(df[symbol_column].unique().tolist())
        else:
            dataset_stocks = []
        
        # Also get from encoder (for model compatibility)
        try:
            encoder_stocks = model_loader.get_stock_names()
        except:
            encoder_stocks = []
        
        # Combine both lists and remove duplicates
        all_stocks = sorted(list(set(dataset_stocks + encoder_stocks)))
        
        return jsonify({
            "success": True,
            "stocks": all_stocks,
            "count": len(all_stocks)
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching stocks: {str(e)}")
        # Fallback to encoder only
        try:
            stocks = model_loader.get_stock_names()
            return jsonify({
                "success": True,
                "stocks": stocks,
                "count": len(stocks)
            }), 200
        except:
            return jsonify({
                "success": False,
                "error": "Failed to fetch stock list",
                "details": str(e)
            }), 500

@predict_bp.route('/predict/fetch-data', methods=['POST'])
def fetch_stock_data():
    """
    Fetch stock data (Open, Close, High, Low, Volume) for a given date and stock name
    
    Expected JSON input:
    {
        "symbol": "AAPL",
        "date": "2024-01-15"
    }
    
    Returns:
    {
        "success": true,
        "data": {
            "open": 150.0,
            "close": 154.0,
            "high": 155.0,
            "low": 149.0,
            "volume": 1000000
        }
    }
    """
    try:
        if not request.is_json:
            return jsonify({
                "success": False,
                "error": "Content-Type must be application/json"
            }), 400
        
        data = request.get_json()
        
        if not data or 'symbol' not in data or 'date' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required fields: symbol and date"
            }), 400
        
        symbol = data.get('symbol')
        date_str = data.get('date')
        
        # Load dataset
        df = load_dataset()
        
        # Get symbol column
        symbol_column = None
        if 'Name' in df.columns:
            symbol_column = 'Name'
        elif 'Symbol' in df.columns:
            symbol_column = 'Symbol'
        elif 'symbol' in df.columns:
            symbol_column = 'symbol'
        
        if not symbol_column:
            return jsonify({
                "success": False,
                "error": "No symbol/name column found in dataset"
            }), 500
        
        # Get date column
        date_col = 'Date' if 'Date' in df.columns else 'date'
        if date_col not in df.columns:
            return jsonify({
                "success": False,
                "error": "No date column found in dataset"
            }), 500
        
        # Convert date to datetime
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        search_date = pd.to_datetime(date_str, errors='coerce')
        
        if pd.isna(search_date):
            return jsonify({
                "success": False,
                "error": "Invalid date format. Use YYYY-MM-DD"
            }), 400
        
        # Filter by symbol and date
        filtered = df[
            (df[symbol_column].str.upper() == symbol.upper()) &
            (df[date_col].dt.date == search_date.date())
        ]
        
        if filtered.empty:
            # Try to get the closest date (previous day)
            stock_df = df[df[symbol_column].str.upper() == symbol.upper()].copy()
            if len(stock_df) > 0:
                stock_df = stock_df.sort_values(by=date_col, ascending=False)
                # Get the most recent record before or on the requested date
                stock_df = stock_df[stock_df[date_col] <= search_date]
                if len(stock_df) > 0:
                    filtered = stock_df.head(1)
        
        if filtered.empty:
            return jsonify({
                "success": False,
                "error": f"No data found for {symbol} on {date_str}"
            }), 404
        
        # Get the first matching record
        record = filtered.iloc[0]
        
        # Extract OHLCV data
        result = {
            "open": float(record.get('Open', record.get('open', 0))),
            "close": float(record.get('Close', record.get('close', 0))),
            "high": float(record.get('High', record.get('high', 0))),
            "low": float(record.get('Low', record.get('low', 0))),
            "volume": float(record.get('Volume', record.get('volume', 0)))
        }
        
        return jsonify({
            "success": True,
            "data": result,
            "symbol": symbol,
            "date": date_str
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching stock data: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to fetch stock data",
            "details": str(e)
        }), 500