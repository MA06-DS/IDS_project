from flask import Blueprint, jsonify
import logging
import pandas as pd
import numpy as np
import json
import os
from datetime import datetime
from sklearn.metrics import mean_squared_error, r2_score
from utils.preprocessing import load_dataset
from utils.load_model import model_loader

dashboard_bp = Blueprint('dashboard', __name__)
logger = logging.getLogger(__name__)

@dashboard_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
   
    try:
        # Load dataset
        df = load_dataset()
        
        # Get total records
        total_records = len(df)
        
        # Get unique stock count
        symbol_column = None
        if 'Name' in df.columns:
            symbol_column = 'Name'
        elif 'Symbol' in df.columns:
            symbol_column = 'Symbol'
        elif 'symbol' in df.columns:
            symbol_column = 'symbol'
        
        total_stocks = df[symbol_column].nunique() if symbol_column else 0
        
        # Date range
        date_column = 'Date' if 'Date' in df.columns else 'date' if 'date' in df.columns else None
        date_range = {}
        
        if date_column:
            df[date_column] = pd.to_datetime(df[date_column], errors='coerce')
            date_range = {
                "start": df[date_column].min().strftime('%Y-%m-%d') if pd.notna(df[date_column].min()) else None,
                "end": df[date_column].max().strftime('%Y-%m-%d') if pd.notna(df[date_column].max()) else None
            }
        
        # Price statistics
        price_stats = {}
        price_columns = ['Close', 'close', 'Price', 'price']
        price_col = next((col for col in price_columns if col in df.columns), None)
        
        if price_col:
            price_stats = {
                "min_price": float(df[price_col].min()),
                "max_price": float(df[price_col].max()),
                "avg_price": float(df[price_col].mean()),
                "median_price": float(df[price_col].median())
            }
        
        # Volume statistics
        volume_stats = {}
        volume_col = 'Volume' if 'Volume' in df.columns else 'volume' if 'volume' in df.columns else None
        
        if volume_col:
            volume_stats = {
                "total_volume": float(df[volume_col].sum()),
                "avg_volume": float(df[volume_col].mean()),
                "max_volume": float(df[volume_col].max())
            }
        
        # Get model info
        try:
            stocks = model_loader.get_stock_names()
            available_stocks = len(stocks)
        except:
            available_stocks = total_stocks
        
        # Load MSE and R2 from saved metrics file (created by file.py during training)
        mse = None
        r2 = None
        metrics_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model_metrics.json")
        
        try:
            if os.path.exists(metrics_path):
                with open(metrics_path, 'r') as f:
                    metrics_data = json.load(f)
                    mse = metrics_data.get('mse')
                    r2 = metrics_data.get('r2')
                    logger.info(f"Loaded metrics from {metrics_path}: MSE={mse}, R²={r2}")
            else:
                logger.warning(f"Metrics file not found at {metrics_path}. Run file.py to generate metrics.")
        except Exception as e:
            logger.warning(f"Could not load metrics from file: {str(e)}")
            # Fallback: Try to calculate on the fly if file doesn't exist
            try:
                model = model_loader.load_model()
                encoder = model_loader.load_label_encoder()
                
                # Prepare data for evaluation (similar to training)
                eval_df = df.copy()
                
                # Convert Date to timestamp (as in training)
                if date_column:
                    eval_df[date_column] = pd.to_datetime(eval_df[date_column], errors='coerce')
                    eval_df[date_column] = eval_df[date_column].astype("int64") // 10**9
                
                # Encode stock names (rename to 'Name' as in training)
                if symbol_column and symbol_column != 'Name':
                    eval_df['Name'] = eval_df[symbol_column]
                
                # Filter to only stocks in encoder
                if 'Name' in eval_df.columns:
                    valid_names = set(encoder.classes_)
                    eval_df = eval_df[eval_df['Name'].isin(valid_names)]
                    
                    # Encode stock names
                    eval_df['Name'] = eval_df['Name'].map(
                        lambda x: encoder.transform([x])[0] if x in encoder.classes_ else -1
                    )
                    eval_df = eval_df[eval_df['Name'] != -1]
                
                # Create lag features (group by original symbol before encoding)
                n_lags = 3
                if symbol_column:
                    for lag in range(1, n_lags + 1):
                        eval_df[f"Close_lag{lag}"] = eval_df.groupby(symbol_column)[price_col].shift(lag)
                
                eval_df = eval_df.dropna()
                
                if len(eval_df) > 0:
                    # Feature columns must match training: Date, Open, High, Low, Volume, Name, Close_lag1-3
                    feature_cols = [date_column, 'Open', 'High', 'Low', 'Volume', 'Name'] + [f'Close_lag{i}' for i in range(1, n_lags + 1)]
                    if all(col in eval_df.columns for col in feature_cols):
                        X_eval = eval_df[feature_cols].astype(float)
                        y_eval = eval_df[price_col].astype(float)
                        
                        y_pred = model.predict(X_eval)
                        mse = float(mean_squared_error(y_eval, y_pred))
                        r2 = float(r2_score(y_eval, y_pred))
                        logger.info(f"Calculated metrics on the fly: MSE={mse}, R²={r2}")
            except Exception as calc_error:
                logger.warning(f"Could not calculate MSE/R2 on the fly: {str(calc_error)}")
        
        # Last updated (use current time or last date in dataset)
        last_updated = date_range.get('end', datetime.now().strftime('%Y-%m-%d'))
        
        # Construct response
        summary = {
            "total_records": total_records,
            "total_stocks": total_stocks,
            "available_stocks": available_stocks,
            "date_range": date_range,
            "price_stats": price_stats,
            "volume_stats": volume_stats,
            "last_updated": last_updated,
            "model_metrics": {
                "mse": mse,
                "r2": r2
            }
        }
        
        logger.info("Dashboard summary generated successfully")
        
        return jsonify({
            "success": True,
            "summary": summary
        }), 200
    
    except FileNotFoundError:
        logger.error("Dataset file not found")
        return jsonify({
            "success": False,
            "error": "Dataset not found"
        }), 500
    
    except Exception as e:
        logger.error(f"Error generating dashboard: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to generate dashboard",
            "details": str(e)
        }), 500

@dashboard_bp.route('/dashboard/recent', methods=['GET'])
def get_recent_data():
    """
    Get most recent stock data (last 10 records)
    
    Returns:
    {
        "success": true,
        "recent_data": [...],
        "count": 10
    }
    """
    try:
        df = load_dataset()
        
        # Sort by date if available
        date_col = 'Date' if 'Date' in df.columns else 'date' if 'date' in df.columns else None
        if date_col:
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            df = df.sort_values(by=date_col, ascending=False)
        
        # Get last 10 records
        recent = df.head(10).to_dict('records')
        
        # Clean data types
        for record in recent:
            for key, value in record.items():
                if hasattr(value, 'item'):
                    record[key] = value.item()
                elif pd.isna(value):
                    record[key] = None
        
        return jsonify({
            "success": True,
            "recent_data": recent,
            "count": len(recent)
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching recent data: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to fetch recent data",
            "details": str(e)
        }), 500

@dashboard_bp.route('/dashboard/stock-changes', methods=['GET'])
def get_stock_changes():
    
    try:
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
                "error": "No symbol/name column found"
            }), 500
        
        # Get date column
        date_col = 'Date' if 'Date' in df.columns else 'date'
        if date_col not in df.columns:
            return jsonify({
                "success": False,
                "error": "No date column found"
            }), 500
        
        # Get price column
        price_col = 'Close' if 'Close' in df.columns else 'close'
        if price_col not in df.columns:
            return jsonify({
                "success": False,
                "error": "No close price column found"
            }), 500
        
        # Convert date to datetime
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        df = df.sort_values(by=[symbol_column, date_col])
        
        # Get latest and previous prices for each stock
        stock_changes = []
        for stock_name in df[symbol_column].unique():
            stock_df = df[df[symbol_column] == stock_name].dropna(subset=[date_col, price_col])
            if len(stock_df) < 2:
                continue
            
            # Get last two records
            last_two = stock_df.tail(2)
            current_price = float(last_two.iloc[-1][price_col])
            previous_price = float(last_two.iloc[-2][price_col])
            
            change = current_price - previous_price
            change_percent = (change / previous_price * 100) if previous_price != 0 else 0
            
            stock_changes.append({
                "name": stock_name,
                "current_price": round(current_price, 2),
                "previous_price": round(previous_price, 2),
                "change": round(change, 2),
                "change_percent": round(change_percent, 2),
                "direction": "up" if change >= 0 else "down"
            })
        
        # Sort by absolute change percentage (most volatile first)
        stock_changes.sort(key=lambda x: abs(x['change_percent']), reverse=True)
        
        # Return ALL stocks (no limit) for infinite loop slideshow
        return jsonify({
            "success": True,
            "stocks": stock_changes,
            "count": len(stock_changes)
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching stock changes: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to fetch stock changes",
            "details": str(e)
        }), 500