from flask import Blueprint, jsonify, request
import logging
import pandas as pd
import numpy as np
from utils.preprocessing import load_dataset
from utils.load_model import model_loader

charts_bp = Blueprint('charts', __name__)
logger = logging.getLogger(__name__)

def generate_predictions_for_chart(df, symbol_column, date_col, symbol):

    try:
        # Make a copy to avoid modifying original
        df = df.copy()
        
        # Ensure date column is datetime
        if date_col and date_col in df.columns:
            if df[date_col].dtype != 'datetime64[ns]':
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            df = df.sort_values(by=date_col, ascending=True)
        
        # Load model and encoder
        model = model_loader.load_model()
        encoder = model_loader.load_label_encoder()
        
        # Encode stock symbol
        try:
            encoded_symbol = encoder.transform([symbol])[0]
        except ValueError:
            logger.warning(f"Symbol {symbol} not found in encoder, skipping predictions")
            encoded_symbol = None
        
        # Prepare data for predictions
        chart_data = []
        n_lags = 3
        
        for idx, row in df.iterrows():
            # Convert row to dict
            record = row.to_dict()
            
            # Clean data types
            for key, value in record.items():
                if hasattr(value, 'item'):  # numpy types
                    record[key] = value.item()
                elif pd.isna(value):  # pandas NaN
                    record[key] = None
            
            # Get current values (handle both cases)
            open_val = float(record.get('Open', record.get('open', 0)))
            high_val = float(record.get('High', record.get('high', 0)))
            low_val = float(record.get('Low', record.get('low', 0)))
            volume_val = float(record.get('Volume', record.get('volume', 0)))
            close_val = float(record.get('Close', record.get('close', 0)))
            
            # Get date and convert to UNIX timestamp
            if date_col and date_col in df.columns:
                date_obj = row[date_col]
                if pd.notna(date_obj):
                    if isinstance(date_obj, pd.Timestamp):
                        date_timestamp = int(date_obj.timestamp())
                    else:
                        date_obj = pd.to_datetime(date_obj, errors='coerce')
                        if pd.notna(date_obj):
                            date_timestamp = int(date_obj.timestamp())
                        else:
                            date_timestamp = 0
                else:
                    date_timestamp = 0
            else:
                date_timestamp = 0
            
            # Calculate lag features from previous rows
            current_idx = df.index.get_loc(idx)
            lag1 = close_val if current_idx == 0 else float(df.iloc[current_idx - 1].get('Close', df.iloc[current_idx - 1].get('close', close_val)))
            lag2 = lag1 if current_idx < 2 else float(df.iloc[current_idx - 2].get('Close', df.iloc[current_idx - 2].get('close', lag1)))
            lag3 = lag2 if current_idx < 3 else float(df.iloc[current_idx - 3].get('Close', df.iloc[current_idx - 3].get('close', lag2)))
            
            # Generate prediction if we have encoded symbol
            predicted_value = None
            if encoded_symbol is not None:
                try:
                    # Create feature array in exact order: Date, Open, High, Low, Volume, Name, Close_lag1, Close_lag2, Close_lag3
                    features = np.array([[
                        float(date_timestamp),  # Date
                        open_val,                # Open
                        high_val,                # High
                        low_val,                 # Low
                        volume_val,              # Volume
                        float(encoded_symbol),   # Name (encoded)
                        lag1,                    # Close_lag1
                        lag2,                    # Close_lag2
                        lag3                     # Close_lag3
                    ]])
                    
                    # Make prediction
                    prediction = model.predict(features)
                    predicted_value = float(prediction[0])
                except Exception as e:
                    logger.warning(f"Error generating prediction for row {idx}: {str(e)}")
                    predicted_value = None
            
            # Add predicted value to record
            record['Predicted'] = predicted_value if predicted_value is not None else None
            
            # Ensure Close is in the record
            if 'Close' not in record and 'close' in record:
                record['Close'] = record['close']
            elif 'close' not in record and 'Close' in record:
                record['close'] = record['Close']
            
            # Convert date to string for JSON
            if date_col and date_col in record:
                if isinstance(record[date_col], pd.Timestamp):
                    record[date_col] = record[date_col].strftime('%Y-%m-%d')
            
            chart_data.append(record)
        
        prediction_count = len([r for r in chart_data if r.get('Predicted') is not None])
        logger.info(f"Generated {prediction_count} predictions for {symbol} out of {len(chart_data)} records")
        return chart_data
        
    except Exception as e:
        logger.error(f"Error generating predictions: {str(e)}")
        # Fallback: return data without predictions
        chart_data = df.to_dict('records')
        for record in chart_data:
            for key, value in record.items():
                if hasattr(value, 'item'):
                    record[key] = value.item()
                elif pd.isna(value):
                    record[key] = None
            record['Predicted'] = None
        return chart_data

@charts_bp.route('/charts/<symbol>', methods=['GET'])
def get_chart_data(symbol):
    
    try:
        # Load dataset
        df = load_dataset()
        
        symbol_column = None
        if 'Name' in df.columns:
            symbol_column = 'Name'
        elif 'Symbol' in df.columns:
            symbol_column = 'Symbol'
        elif 'symbol' in df.columns:
            symbol_column = 'symbol'
        else:
            return jsonify({
                "success": False,
                "error": "No symbol/name column found in dataset"
            }), 500
        
        df[symbol_column] = df[symbol_column].astype(str)
        filtered_df = df[df[symbol_column].str.upper() == symbol.upper()]
        
        if filtered_df.empty:
            # Try exact match (case-sensitive) as fallback
            filtered_df = df[df[symbol_column] == symbol]
            if filtered_df.empty:
                logger.warning(f"No data found for symbol: {symbol}. Available symbols: {df[symbol_column].unique()[:10]}")
                return jsonify({
                    "success": False,
                    "error": f"No data found for symbol: {symbol}"
                }), 404
        
        # Get query parameters
        limit = request.args.get('limit', default=100, type=int)
        sort_order = request.args.get('sort', default='asc', type=str).lower()
        
        # Sort by date if available (default to ascending for proper chart display)
        date_col = None
        if 'Date' in filtered_df.columns:
            date_col = 'Date'
        elif 'date' in filtered_df.columns:
            date_col = 'date'
        
        if date_col:
            # Convert to datetime for proper sorting
            filtered_df[date_col] = pd.to_datetime(filtered_df[date_col], errors='coerce')
            filtered_df = filtered_df.sort_values(by=date_col, ascending=(sort_order == 'asc'))
            # Keep as datetime for prediction function
        
        # Limit results
        filtered_df = filtered_df.head(limit)
        
        # Generate predictions for each data point
        chart_data = generate_predictions_for_chart(filtered_df, symbol_column, date_col, symbol)
        
        logger.info(f"Fetched {len(chart_data)} records with predictions for symbol {symbol}")
        
        return jsonify({
            "success": True,
            "symbol": symbol,
            "data": chart_data,
            "count": len(chart_data)
        }), 200
    
    except FileNotFoundError as fnf:
        logger.error(f"Dataset not found: {str(fnf)}")
        return jsonify({
            "success": False,
            "error": "Dataset not found"
        }), 500
    
    except Exception as e:
        logger.error(f"Error fetching chart data for {symbol}: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to fetch chart data",
            "details": str(e)
        }), 500

@charts_bp.route('/charts', methods=['GET'])
def get_all_charts():

    try:
        df = load_dataset()
        
        limit = request.args.get('limit', default=50, type=int)
        start_date = request.args.get('start_date', default=None, type=str)
        end_date = request.args.get('end_date', default=None, type=str)
        
        # Filter by date range if provided
        if start_date or end_date:
            date_col = 'Date' if 'Date' in df.columns else 'date'
            if date_col in df.columns:
                df[date_col] = pd.to_datetime(df[date_col])
                if start_date:
                    df = df[df[date_col] >= start_date]
                if end_date:
                    df = df[df[date_col] <= end_date]
        
        # Limit results
        df = df.head(limit)
        
        # Convert to records
        data = df.to_dict('records')
        
        # Clean data types
        for record in data:
            for key, value in record.items():
                if hasattr(value, 'item'):
                    record[key] = value.item()
                elif pd.isna(value):
                    record[key] = None
        
        return jsonify({
            "success": True,
            "data": data,
            "count": len(data)
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching all chart data: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to fetch chart data",
            "details": str(e)
        }), 500