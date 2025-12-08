import pandas as pd
import numpy as np
import logging
from utils.load_model import model_loader

logger = logging.getLogger(__name__)

def preprocess_prediction_input(data):
    """
    Preprocess input data for prediction
    
    Expected input format:
    {
        "symbol": "AAPL",
        "open": 150.0,
        "high": 155.0,
        "low": 149.0,
        "close": 154.0,  # Optional, will be fetched from dataset if not provided
        "volume": 1000000,
        "date": "2024-01-15"  # Optional, defaults to today
    }
    
    Model expects 9 features in this exact order:
    1. Date (UNIX timestamp)
    2. Open
    3. High
    4. Low
    5. Volume
    6. Name (encoded)
    7. Close_lag1
    8. Close_lag2
    9. Close_lag3
    
    Returns: numpy array ready for model prediction
    """
    try:
        # Validate required fields
        required_fields = ['symbol', 'open', 'high', 'low', 'volume']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Encode stock symbol
        try:
            encoded_symbol = model_loader.encode_stock_name(data['symbol'])
        except Exception as e:
            raise ValueError(f"Invalid stock symbol: {data['symbol']}")
        
        # Get or generate date (convert to UNIX timestamp)
        # Handle both 'date' and 'Date' from frontend
        date_str = data.get('date') or data.get('Date')
        if date_str:
            date_obj = pd.to_datetime(date_str, errors='coerce')
            if pd.isna(date_obj):
                raise ValueError(f"Invalid date format: {date_str}. Use YYYY-MM-DD")
            date_timestamp = int(date_obj.timestamp())
        else:
            # Default to current date
            from datetime import datetime
            date_timestamp = int(datetime.now().timestamp())
        
        # Get lag features (previous 3 days' close prices)
        # We need to fetch these from the dataset
        lag_features = get_lag_features(
            symbol=data['symbol'],
            date_str=date_str,
            current_close=data.get('close')
        )
        
        # Create feature array in EXACT order as training:
        # Date, Open, High, Low, Volume, Name, Close_lag1, Close_lag2, Close_lag3
        features = [
            float(date_timestamp),  # Date (UNIX timestamp)
            float(data['open']),    # Open
            float(data['high']),    # High
            float(data['low']),     # Low
            float(data['volume']),  # Volume
            float(encoded_symbol),  # Name (encoded)
            float(lag_features['Close_lag1']),  # Close_lag1
            float(lag_features['Close_lag2']),  # Close_lag2
            float(lag_features['Close_lag3'])   # Close_lag3
        ]
        
        # Convert to numpy array and reshape for single prediction
        feature_array = np.array(features).reshape(1, -1)
        
        logger.info(f"Preprocessed input for {data['symbol']}: {len(features)} features")
        logger.debug(f"Features: Date={date_timestamp}, Open={data['open']}, High={data['high']}, Low={data['low']}, Volume={data['volume']}, Name={encoded_symbol}, Lags={lag_features}")
        
        return feature_array
    
    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        raise
    except Exception as e:
        logger.error(f"Error preprocessing input: {str(e)}")
        raise ValueError(f"Preprocessing failed: {str(e)}")

def get_lag_features(symbol, date_str=None, current_close=None):
    """
    Get lag features (previous 3 days' close prices) from dataset
    
    Returns dict with Close_lag1, Close_lag2, Close_lag3
    If not available in dataset, uses current_close or estimates
    """
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
            logger.warning("No symbol column found, using default lag values")
            return get_default_lags(current_close)
        
        # Filter by symbol (case-insensitive)
        df[symbol_column] = df[symbol_column].astype(str)
        stock_df = df[df[symbol_column].str.upper() == symbol.upper()].copy()
        
        if stock_df.empty:
            logger.warning(f"No historical data found for {symbol}, using default lag values")
            return get_default_lags(current_close)
        
        # Get date column
        date_col = 'Date' if 'Date' in df.columns else 'date'
        if date_col not in stock_df.columns:
            logger.warning("No date column found, using default lag values")
            return get_default_lags(current_close)
        
        # Get close column
        close_col = 'Close' if 'Close' in stock_df.columns else 'close'
        if close_col not in stock_df.columns:
            logger.warning("No close column found, using default lag values")
            return get_default_lags(current_close)
        
        # Convert date to datetime and sort
        stock_df[date_col] = pd.to_datetime(stock_df[date_col], errors='coerce')
        stock_df = stock_df.sort_values(by=date_col, ascending=False)
        stock_df = stock_df.dropna(subset=[date_col, close_col])
        
        if len(stock_df) == 0:
            logger.warning(f"No valid data found for {symbol}, using default lag values")
            return get_default_lags(current_close)
        
        # Get the most recent close prices (excluding current date if provided)
        if date_str:
            date_obj = pd.to_datetime(date_str, errors='coerce')
            if not pd.isna(date_obj):
                # Get data before the prediction date
                stock_df = stock_df[stock_df[date_col] < date_obj]
        
        # Extract lag features from historical data
        lags = {
            'Close_lag1': 0.0,
            'Close_lag2': 0.0,
            'Close_lag3': 0.0
        }
        
        if len(stock_df) >= 1:
            lags['Close_lag1'] = float(stock_df.iloc[0][close_col])
        if len(stock_df) >= 2:
            lags['Close_lag2'] = float(stock_df.iloc[1][close_col])
        if len(stock_df) >= 3:
            lags['Close_lag3'] = float(stock_df.iloc[2][close_col])
        
        # If we have fewer than 3 historical values, use the most recent value
        if len(stock_df) > 0:
            most_recent_close = float(stock_df.iloc[0][close_col])
            if lags['Close_lag1'] == 0.0:
                lags['Close_lag1'] = most_recent_close
            if lags['Close_lag2'] == 0.0:
                lags['Close_lag2'] = most_recent_close
            if lags['Close_lag3'] == 0.0:
                lags['Close_lag3'] = most_recent_close
        
        # If still no values, use current_close or estimate
        if lags['Close_lag1'] == 0.0:
            return get_default_lags(current_close)
        
        logger.info(f"Retrieved lag features for {symbol}: {lags}")
        return lags
        
    except Exception as e:
        logger.warning(f"Error fetching lag features: {str(e)}, using defaults")
        return get_default_lags(current_close)

def get_default_lags(current_close=None):
    """
    Get default lag values when historical data is not available
    Uses current_close if provided, otherwise returns zeros
    """
    if current_close is not None:
        close_val = float(current_close)
        return {
            'Close_lag1': close_val,
            'Close_lag2': close_val,
            'Close_lag3': close_val
        }
    else:
        # Return small non-zero values to avoid issues
        return {
            'Close_lag1': 1.0,
            'Close_lag2': 1.0,
            'Close_lag3': 1.0
        }

def validate_numeric_input(value, field_name, min_value=None, max_value=None):
    """Validate numeric input fields"""
    try:
        num_value = float(value)
        
        if np.isnan(num_value) or np.isinf(num_value):
            raise ValueError(f"{field_name} must be a valid number")
        
        if min_value is not None and num_value < min_value:
            raise ValueError(f"{field_name} must be >= {min_value}")
        
        if max_value is not None and num_value > max_value:
            raise ValueError(f"{field_name} must be <= {max_value}")
        
        return num_value
    
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid {field_name}: {str(e)}")

def load_dataset(file_path=None):
    """Load and return the dataset"""
    try:
        # Default to dataset.csv in backend directory
        if file_path is None:
            import os
            # Get backend directory (parent of utils directory)
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            file_path = os.path.join(backend_dir, 'dataset.csv')
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Dataset not found: {file_path}")
        
        df = pd.read_csv(file_path)
        logger.info(f"Dataset loaded: {len(df)} rows, {len(df.columns)} columns")
        
        return df
    
    except Exception as e:
        logger.error(f"Error loading dataset: {str(e)}")
        raise

def get_dataset_summary(df):
    """Generate summary statistics for the dataset"""
    try:
        summary = {
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "columns": df.columns.tolist(),
            "missing_values": df.isnull().sum().to_dict(),
            "data_types": df.dtypes.astype(str).to_dict()
        }
        
        # Numeric column statistics
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if numeric_cols:
            summary["numeric_summary"] = df[numeric_cols].describe().to_dict()
        
        return summary
    
    except Exception as e:
        logger.error(f"Error generating dataset summary: {str(e)}")
        raise